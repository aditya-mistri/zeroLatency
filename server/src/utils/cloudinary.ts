import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file buffer to Cloudinary
 * @param fileBuffer - The file buffer to upload
 * @param folder - The folder name in Cloudinary (e.g., 'doctor-licenses')
 * @param publicId - Optional public ID for the file
 * @returns Promise with the upload result
 */
export const uploadToCloudinary = async (
  fileBuffer: Buffer,
  folder: string,
  publicId?: string
): Promise<{ url: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        public_id: publicId,
        resource_type: 'auto', // Automatically detect file type
        allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        } else {
          reject(new Error('Upload failed with no result'));
        }
      }
    );

    // Convert buffer to stream and pipe to Cloudinary
    const readableStream = new Readable();
    readableStream.push(fileBuffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

/**
 * Delete a file from Cloudinary
 * @param publicId - The public ID of the file to delete
 * @returns Promise with the deletion result
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

export default cloudinary;
