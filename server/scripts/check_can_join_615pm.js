const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCanJoin() {
  const appointmentId = 'cmhrp1qbc0001lcsgzpxky5yx';
  
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      doctor: { select: { id: true, firstName: true, lastName: true } },
      patient: { select: { id: true, firstName: true, lastName: true } }
    }
  });

  if (!appointment) {
    console.log('Appointment not found');
    return;
  }

  console.log('=== APPOINTMENT ===');
  console.log('ID:', appointment.id);
  console.log('Status:', appointment.status);
  console.log('Scheduled At:', appointment.scheduledAt.toISOString());
  console.log('Duration:', appointment.duration, 'minutes');
  
  const now = new Date();
  const scheduledTime = new Date(appointment.scheduledAt);
  const endTime = new Date(scheduledTime.getTime() + appointment.duration * 60 * 1000);
  const bufferStartTime = new Date(scheduledTime.getTime() - 5 * 60 * 1000);
  const bufferEndTime = new Date(endTime.getTime() + 5 * 60 * 1000);
  
  console.log('\n=== TIME WINDOW ===');
  console.log('Current Time (IST):', now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }));
  console.log('Buffer Start (IST):', bufferStartTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }));
  console.log('Scheduled Start (IST):', scheduledTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }));
  console.log('Scheduled End (IST):', endTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }));
  console.log('Buffer End (IST):', bufferEndTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }));
  
  console.log('\n=== CAN JOIN LOGIC ===');
  console.log('Is appointment active?', ['CONFIRMED', 'IN_PROGRESS'].includes(appointment.status));
  console.log('Is within buffer window?', now >= bufferStartTime && now <= bufferEndTime);
  console.log('Now >= Buffer Start?', now >= bufferStartTime);
  console.log('Now <= Buffer End?', now <= bufferEndTime);
  
  // Check for doctor conflicts
  const doctorOtherInProgress = await prisma.appointment.findFirst({
    where: {
      doctorId: appointment.doctorId,
      status: 'IN_PROGRESS',
      id: { not: appointmentId }
    }
  });
  
  console.log('Doctor has other IN_PROGRESS?', !!doctorOtherInProgress);
  
  // Determine canJoin for patient
  const patientCanJoin = ['CONFIRMED', 'IN_PROGRESS'].includes(appointment.status) &&
                         now >= bufferStartTime && 
                         now <= bufferEndTime;
  
  // Determine canJoin for doctor
  const doctorCanJoin = ['CONFIRMED', 'IN_PROGRESS'].includes(appointment.status) &&
                        now >= bufferStartTime && 
                        now <= bufferEndTime &&
                        !doctorOtherInProgress;
  
  console.log('\n=== RESULT ===');
  console.log('Patient (', appointment.patient.firstName, ') can join:', patientCanJoin);
  console.log('Doctor (', appointment.doctor.firstName, ') can join:', doctorCanJoin);
  
  if (!patientCanJoin || !doctorCanJoin) {
    if (now < bufferStartTime) {
      console.log('Reason: Too early (before 5 min buffer)');
    } else if (now > bufferEndTime) {
      console.log('Reason: Too late (after 5 min buffer ended)');
    } else if (doctorOtherInProgress) {
      console.log('Reason: Doctor in another meeting');
    } else if (!['CONFIRMED', 'IN_PROGRESS'].includes(appointment.status)) {
      console.log('Reason: Appointment status is', appointment.status);
    }
  }
}

checkCanJoin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
