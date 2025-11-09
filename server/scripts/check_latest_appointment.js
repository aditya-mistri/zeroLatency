const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkLatestAppointment() {
  // Get the most recent appointment
  const appointment = await prisma.appointment.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      patient: { select: { id: true, email: true, firstName: true, lastName: true } },
      doctor: { select: { id: true, email: true, firstName: true, lastName: true } }
    }
  });

  if (!appointment) {
    console.log('No appointments found');
    return;
  }

  console.log('=== LATEST APPOINTMENT ===');
  console.log('ID:', appointment.id);
  console.log('Status:', appointment.status);
  console.log('Created At:', appointment.createdAt.toISOString());
  console.log('\n--- SCHEDULED TIME ---');
  console.log('Scheduled At (UTC):', appointment.scheduledAt.toISOString());
  console.log('Scheduled At (IST):', appointment.scheduledAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }));
  console.log('Duration:', appointment.duration, 'minutes');
  
  console.log('\n--- PARTICIPANTS ---');
  console.log('Patient:', appointment.patient.firstName, appointment.patient.lastName, `(${appointment.patient.email})`);
  console.log('Doctor:', appointment.doctor.firstName, appointment.doctor.lastName, `(${appointment.doctor.email})`);
  
  // Calculate end time
  const endTime = new Date(appointment.scheduledAt.getTime() + appointment.duration * 60 * 1000);
  console.log('\n--- TIME WINDOW ---');
  console.log('Start (IST):', appointment.scheduledAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }));
  console.log('End (IST):', endTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }));
  
  // Check if it's in the future
  const now = new Date();
  console.log('\n--- STATUS CHECK ---');
  console.log('Current Time (IST):', now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }));
  console.log('Is in future?', appointment.scheduledAt > now);
}

checkLatestAppointment()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
