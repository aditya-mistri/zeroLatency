const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteBuggyAppointment() {
  // Delete the appointment that was booked with wrong timezone
  const deleted = await prisma.appointment.delete({
    where: { id: 'cmhrofcx00003lchwhsxk9ya8' }
  });
  
  console.log('Deleted buggy appointment:', deleted.id);
  console.log('Scheduled At (wrong):', deleted.scheduledAt.toISOString());
}

deleteBuggyAppointment()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
