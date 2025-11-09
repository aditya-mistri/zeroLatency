const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkNewAppointment() {
  const appointment = await prisma.appointment.findUnique({
    where: { id: 'cmhrofcx00003lchwhsxk9ya8' }
  });

  if (!appointment) {
    console.log('Appointment not found');
    return;
  }

  console.log('Appointment Details:');
  console.log('ID:', appointment.id);
  console.log('Scheduled At (UTC):', appointment.scheduledAt.toISOString());
  
  // Convert to IST manually
  const scheduledDate = new Date(appointment.scheduledAt);
  console.log('Scheduled At (IST):', scheduledDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
  
  console.log('\nDuration:', appointment.duration, 'minutes');
  console.log('Status:', appointment.status);
  console.log('Patient ID:', appointment.patientId);
  console.log('Doctor ID:', appointment.doctorId);
}

checkNewAppointment()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
