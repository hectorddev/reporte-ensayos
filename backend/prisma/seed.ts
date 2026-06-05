import { PrismaClient, CategoriaDemografica } from '@prisma/client';

const prisma = new PrismaClient();

const AGRUPACIONES = [
  { codigo: 'PNISPIM', nombre: 'PNISPIM' },
  { codigo: 'DOPIM', nombre: 'DOPIM' },
  { codigo: 'RE_Y_MIPIM', nombre: 'RE Y MIPIM' },
  { codigo: 'PREPARATORIO_PIM', nombre: 'PREPARATORIO PIM' },
  { codigo: 'PRE_INFANTIL_ETAPA_1', nombre: 'PRE INFANTIL ETAPA 1' },
  { codigo: 'CORO_INFANTIL', nombre: 'CORO INFANTIL' },
  { codigo: 'ALMA_LLANERA_NIVEL_I', nombre: 'ALMA LLANERA NIVEL I' },
  { codigo: 'ALMA_LLANERA_NIVEL_II', nombre: 'ALMA LLANERA NIVEL II' },
  { codigo: 'ALMA_LLANERA_NIVEL_III', nombre: 'ALMA LLANERA NIVEL III' },
  { codigo: 'ORQUESTAL_PRE_INFANTIL_E2', nombre: 'ORQUESTAL PRE INFANTIL ETAPA 2' },
  { codigo: 'ORQUESTAL_INFANTIL', nombre: 'ORQUESTAL INFANTIL' },
];

const ESTUDIANTES_DEMO = [
  { nombre: 'Ana', apellido: 'García', categoria: CategoriaDemografica.NINAS },
  { nombre: 'Carlos', apellido: 'López', categoria: CategoriaDemografica.NINOS },
  { nombre: 'María', apellido: 'Rodríguez', categoria: CategoriaDemografica.ADOLESCENTE_FEMENINA },
  { nombre: 'José', apellido: 'Martínez', categoria: CategoriaDemografica.ADOLESCENTE_MASCULINO },
  { nombre: 'Laura', apellido: 'Hernández', categoria: CategoriaDemografica.ADULTO_FEMENINO },
  { nombre: 'Pedro', apellido: 'Díaz', categoria: CategoriaDemografica.ADULTO_MASCULINO },
];

function diasAtras(n: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  for (const agr of AGRUPACIONES) {
    const agrupacion = await prisma.agrupacion.upsert({
      where: { codigo: agr.codigo },
      create: agr,
      update: { nombre: agr.nombre },
    });

    for (const est of ESTUDIANTES_DEMO) {
      const existente = await prisma.estudiante.findFirst({
        where: { agrupacionId: agrupacion.id, nombre: est.nombre, apellido: est.apellido },
      });
      if (!existente) {
        await prisma.estudiante.create({
          data: {
            agrupacionId: agrupacion.id,
            nombre: est.nombre,
            apellido: est.apellido,
            categoriaDemografica: est.categoria,
          },
        });
      }
    }
  }

  const coro = await prisma.agrupacion.findUnique({ where: { codigo: 'CORO_INFANTIL' } });
  if (coro) {
    const estudiantes = await prisma.estudiante.findMany({
      where: { agrupacionId: coro.id },
      take: 4,
    });

    const fechasEnsayo = [7, 14, 21, 28].map(diasAtras);

    for (const fecha of fechasEnsayo) {
      const ensayo = await prisma.ensayo.upsert({
        where: { agrupacionId_fecha: { agrupacionId: coro.id, fecha } },
        create: { agrupacionId: coro.id, fecha },
        update: {},
      });

      for (let i = 0; i < estudiantes.length; i++) {
        const presente = i < 3;
        await prisma.asistencia.upsert({
          where: {
            ensayoId_estudianteId: {
              ensayoId: ensayo.id,
              estudianteId: estudiantes[i].id,
            },
          },
          create: {
            ensayoId: ensayo.id,
            estudianteId: estudiantes[i].id,
            presente,
          },
          update: { presente },
        });
      }
    }
  }

  const obras = ['Canción Llanera', 'El Alma de Venezuela', 'Suite Infantil'];
  for (const titulo of obras) {
    const existe = await prisma.obra.findFirst({ where: { titulo } });
    if (!existe) {
      await prisma.obra.create({ data: { titulo } });
    }
  }

  console.log('Seed completado: agrupaciones, estudiantes demo y ensayos de CORO INFANTIL.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
