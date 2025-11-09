const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    const start = new Date('2025-11-09T11:00:00.000Z');
    const end = new Date('2025-11-09T12:00:00.000Z');
    console.log('Searching appointments between', start.toISOString(), 'and', end.toISOString());
    const appts = await prisma.appointment.findMany({
      where: {
        scheduledAt: { gte: start, lt: end }
      },
      include: {
        doctor: { select: { id: true, email: true, firstName: true, lastName: true } },
        patient: { select: { id: true, email: true, firstName: true, lastName: true } }
      }
    });
    console.log('Found', appts.length, 'appointments');
    for (const a of appts) {
      console.log('---');
      console.log('id:', a.id);
      console.log('scheduledAt:', a.scheduledAt.toISOString());
      console.log('duration:', a.duration);
      console.log('status:', a.status);
      console.log('patientId:', a.patientId, a.patient?.email);
      console.log('doctorId:', a.doctorId, a.doctor?.email);
      // Check if doctor has other IN_PROGRESS appointment
      const other = await prisma.appointment.findFirst({
        where: {
          doctorId: a.doctorId,
          id: { not: a.id },
          status: 'IN_PROGRESS'
        }
      });
      console.log('doctorHasOtherInProgress:', !!other);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
})();
