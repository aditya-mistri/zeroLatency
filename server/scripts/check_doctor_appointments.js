const { PrismaClient, AppointmentStatus } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDoctorAppointments() {
  // Get the doctor
  const doctor = await prisma.user.findFirst({
    where: { email: 'doctor@gmail.com' },
    include: { doctorProfile: true }
  });

  if (!doctor) {
    console.log('Doctor not found');
    return;
  }

  console.log('=== DOCTOR ===');
  console.log('Name:', doctor.firstName, doctor.lastName);
  console.log('Email:', doctor.email);
  console.log('ID:', doctor.id);
  
  // Get all appointments for this doctor (excluding PAYMENT_PENDING)
  const appointments = await prisma.appointment.findMany({
    where: {
      doctorId: doctor.id,
      status: {
        not: AppointmentStatus.PAYMENT_PENDING
      }
    },
    include: {
      patient: {
        select: { firstName: true, lastName: true, email: true }
      }
    },
    orderBy: { scheduledAt: 'asc' }
  });

  console.log(`\n=== APPOINTMENTS (${appointments.length} total) ===`);
  
  appointments.forEach((appt, index) => {
    const scheduledIST = appt.scheduledAt.toLocaleString('en-IN', { 
      timeZone: 'Asia/Kolkata', 
      dateStyle: 'medium',
      timeStyle: 'short',
      hour12: true 
    });
    
    console.log(`\n${index + 1}. Appointment ${appt.id.slice(-8)}`);
    console.log('   Status:', appt.status);
    console.log('   Scheduled (UTC):', appt.scheduledAt.toISOString());
    console.log('   Scheduled (IST):', scheduledIST);
    console.log('   Duration:', appt.duration, 'min');
    console.log('   Patient:', appt.patient.firstName, appt.patient.lastName);
    console.log('   Created:', appt.createdAt.toISOString());
  });
  
  // Check if there are any PAYMENT_PENDING appointments
  const paymentPending = await prisma.appointment.count({
    where: {
      doctorId: doctor.id,
      status: AppointmentStatus.PAYMENT_PENDING
    }
  });
  
  console.log(`\n=== HIDDEN FROM DOCTOR (PAYMENT_PENDING) ===`);
  console.log('Count:', paymentPending);
}

checkDoctorAppointments()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
