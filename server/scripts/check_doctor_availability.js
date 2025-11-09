const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDoctorAvailability() {
  // Get the doctor who has the appointment
  const appointment = await prisma.appointment.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      doctor: {
        include: {
          doctorProfile: true
        }
      }
    }
  });

  if (!appointment) {
    console.log('No appointments found');
    return;
  }

  console.log('=== DOCTOR INFO ===');
  console.log('Doctor:', appointment.doctor.firstName, appointment.doctor.lastName);
  console.log('Doctor Profile ID:', appointment.doctor.doctorProfile?.id);
  
  // Get availability for today
  const today = new Date('2025-11-09T00:00:00Z');
  
  const availability = await prisma.doctorAvailability.findMany({
    where: {
      doctorProfileId: appointment.doctor.doctorProfile?.id,
      date: today
    }
  });
  
  console.log('\n=== AVAILABILITY FOR NOV 9, 2025 ===');
  if (availability.length === 0) {
    console.log('No availability set for today!');
  } else {
    availability.forEach(avail => {
      console.log('Start Time:', avail.startTime, '(IST)');
      console.log('End Time:', avail.endTime, '(IST)');
      console.log('Slot Duration:', avail.slotDuration, 'minutes');
      console.log('Is Available:', avail.isAvailable);
      console.log('Created At:', avail.createdAt.toISOString());
      console.log('Updated At:', avail.updatedAt.toISOString());
    });
  }
  
  console.log('\n=== APPOINTMENT TIME ===');
  console.log('Scheduled At (IST):', appointment.scheduledAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }));
}

checkDoctorAvailability()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
