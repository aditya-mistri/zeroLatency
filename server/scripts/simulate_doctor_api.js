const { PrismaClient, AppointmentStatus } = require('@prisma/client');

const prisma = new PrismaClient();

async function simulateDoctorAPICall() {
  const doctorEmail = 'doctor@gmail.com';
  
  // Get the doctor
  const doctor = await prisma.user.findFirst({
    where: { email: doctorEmail }
  });

  if (!doctor) {
    console.log('Doctor not found');
    return;
  }

  console.log('=== SIMULATING DOCTOR API CALL ===');
  console.log('Doctor ID:', doctor.id);
  console.log('Email:', doctor.email);
  
  // Simulate the exact query from getAppointments controller
  const whereClause = {
    doctorId: doctor.id,
    status: {
      not: AppointmentStatus.PAYMENT_PENDING
    }
  };
  
  const appointments = await prisma.appointment.findMany({
    where: whereClause,
    include: {
      doctor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          doctorProfile: {
            select: {
              specialization: true,
              consultationFee: true,
              hospital: {
                select: {
                  name: true,
                  address: true,
                },
              },
            },
          },
        },
      },
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          dateOfBirth: true,
          gender: true,
        },
      },
    },
    orderBy: {
      scheduledAt: 'asc',
    }
  });

  console.log(`\n=== APPOINTMENTS RETURNED (${appointments.length} total) ===\n`);
  
  appointments.forEach((appt, index) => {
    const scheduledIST = new Date(appt.scheduledAt).toLocaleString('en-US', { 
      timeZone: 'Asia/Kolkata',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    console.log(`${index + 1}. [${appt.status}] ${scheduledIST} IST`);
    console.log(`   Patient: ${appt.patient.firstName} ${appt.patient.lastName}`);
    console.log(`   ID: ${appt.id}`);
    console.log('');
  });
  
  // Check specifically for the 6:15 PM appointment
  console.log('=== CHECKING FOR 6:15 PM APPOINTMENT ===');
  const targetAppt = appointments.find(a => {
    const istTime = new Date(a.scheduledAt).toLocaleString('en-US', { 
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return istTime.includes('6:15');
  });
  
  if (targetAppt) {
    console.log('✅ Found 6:15 PM appointment:');
    console.log('   ID:', targetAppt.id);
    console.log('   Status:', targetAppt.status);
    console.log('   Patient:', targetAppt.patient.firstName, targetAppt.patient.lastName);
  } else {
    console.log('❌ 6:15 PM appointment NOT in API response');
  }
}

simulateDoctorAPICall()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
