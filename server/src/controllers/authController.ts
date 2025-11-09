import { Request, Response } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { 
  hashPassword, 
  comparePassword, 
  generateToken, 
  isValidEmail, 
  isValidPassword, 
  sanitizeUser,
  formatResponse 
} from '../utils/helpers';

const prisma = new PrismaClient();

// Register new user
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phone, 
      role = UserRole.PATIENT,
      // Doctor-specific fields
      specialization,
      experience,
      qualification,
      consultationFee,
      // Patient-specific fields
      dateOfBirth,
      gender,
      address
    } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      res.status(400).json(formatResponse(
        'error',
        'Email, password, firstName, and lastName are required'
      ));
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json(formatResponse('error', 'Invalid email format'));
      return;
    }

    if (!isValidPassword(password)) {
      res.status(400).json(formatResponse(
        'error',
        'Password must be at least 8 characters with uppercase, lowercase, and number'
      ));
      return;
    }
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      res.status(409).json(formatResponse('error', 'User already exists with this email'));
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const userData: any = {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      role,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender,
      address,
    };

    const user = await prisma.user.create({
      data: userData,
      include: {
        doctorProfile: true,
      },
    });

    // If registering as doctor, create doctor profile
    if (role === UserRole.DOCTOR) {
      if (!specialization || !experience || !qualification || !consultationFee) {
        res.status(400).json(formatResponse(
          'error',
          'Doctor registration requires specialization, experience, qualification, and consultationFee'
        ));
        return;
      }

      await prisma.doctorProfile.create({
        data: {
          userId: user.id,
          specialization,
          experience: parseInt(experience),
          qualification,
          consultationFee: parseFloat(consultationFee),
        },
      });
    }
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Return success response
    res.status(201).json(formatResponse(
      'success',
      'User registered successfully',
      {
        user: sanitizeUser(user),
        token,
      }
    ));
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json(formatResponse('error', 'Internal server error'));
  }
};

// Login user
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json(formatResponse('error', 'Email and password are required'));
      return;
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        doctorProfile: {
          include: {
            hospital: true,
          },
        },
      },
    });

    if (!user) {
      res.status(401).json(formatResponse('error', 'Invalid email or password'));
      return;
    }
    if (!user.isActive) {
      res.status(401).json(formatResponse('error', 'Account is deactivated'));
      return;
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json(formatResponse('error', 'Invalid email or password'));
      return;
    }
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Return success response
    res.status(200).json(formatResponse(
      'success',
      'Login successful',
      {
        user: sanitizeUser(user),
        token,
      }
    ));
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json(formatResponse('error', 'Internal server error'));
  }
};
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatResponse('error', 'User not authenticated'));
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        doctorProfile: {
          include: {
            hospital: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json(formatResponse('error', 'User not found'));
      return;
    }

    res.status(200).json(formatResponse(
      'success',
      'Profile retrieved successfully',
      { user: sanitizeUser(user) }
    ));
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json(formatResponse('error', 'Internal server error'));
  }
};
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatResponse('error', 'User not authenticated'));
      return;
    }

    const { 
      firstName, 
      lastName, 
      phone, 
      dateOfBirth, 
      gender, 
      address,
      avatar 
    } = req.body;

    const updateData: any = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);
    if (gender) updateData.gender = gender;
    if (address) updateData.address = address;
    if (avatar) updateData.avatar = avatar;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      include: {
        doctorProfile: {
          include: {
            hospital: true,
          },
        },
      },
    });

    res.status(200).json(formatResponse(
      'success',
      'Profile updated successfully',
      { user: sanitizeUser(user) }
    ));
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json(formatResponse('error', 'Internal server error'));
  }
};