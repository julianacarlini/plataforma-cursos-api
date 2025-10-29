import { PrismaClient, RoleName, CourseStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();
async function main() {
    console.log('> Seeding…');
    //Roles
    await prisma.role.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1, name: RoleName.ADMIN },
    });
    await prisma.role.upsert({
        where: { id: 2 },
        update: {},
        create: { id: 2, name: RoleName.PROFESSOR },
    });
    await prisma.role.upsert({
        where: { id: 3 },
        update: {},
        create: { id: 3, name: RoleName.ALUNO },
    });
    //Usuários
    const admin = await prisma.user.upsert({
        where: { email: 'admin@exemplo.com' },
        update: {},
        create: {
            name: 'Admin',
            email: 'admin@exemplo.com',
            passwordHash: await bcrypt.hash('admin1234', 12),
            roleId: 1,
        },
    });
    const prof = await prisma.user.upsert({
        where: { email: 'prof@exemplo.com' },
        update: {},
        create: {
            name: 'Prof. Ana',
            email: 'prof@exemplo.com',
            passwordHash: await bcrypt.hash('prof1234', 12),
            roleId: 2,
        },
    });
    const aluno = await prisma.user.upsert({
        where: { email: 'aluno@exemplo.com' },
        update: {},
        create: {
            name: 'Aluno Carlos',
            email: 'aluno@exemplo.com',
            passwordHash: await bcrypt.hash('aluno1234', 12),
            roleId: 3,
        },
    });
    const teacherId = BigInt(prof.id);
    const adminId = BigInt(admin.id);
    const alunoId = BigInt(aluno.id);
    //Cursos (APPROVED)
    const alemAO = await prisma.course.upsert({
        where: { id: 1 },
        update: {
            imageUrl: '/images/imagem-curso-alemao.webp'
        },
        create: {
            title: 'Alemão para iniciantes (A1)',
            description: 'Curso introdutório de alemão: fonética, saudações, verbos básicos e frases do dia a dia.',
            category: 'Idiomas',
            status: CourseStatus.APPROVED,
            teacherId,
            createdById: teacherId,
            imageUrl: '/images/imagem-curso-alemao.webp',
        },
    });
    const web = await prisma.course.upsert({
        where: { id: 2 },
        update: {},
        create: {
            title: 'Programação Web do Zero',
            description: 'HTML5, CSS3 e JavaScript moderno. Conceitos essenciais e primeiros projetos.',
            category: 'Programação',
            status: CourseStatus.APPROVED,
            teacherId,
            createdById: teacherId,
            imageUrl: 'https://picsum.photos/seed/webdev/600/360',
        },
    });
    //Exemplo de curso PENDING (aparece só para admin/professor em telas internas)
    await prisma.course.upsert({
        where: { id: 3 },
        update: {},
        create: {
            title: 'Python para Análise de Dados',
            description: 'Pandas, NumPy e visualização. Aguardando aprovação do admin.',
            category: 'Dados',
            status: CourseStatus.PENDING,
            createdById: teacherId,
            imageUrl: 'https://picsum.photos/seed/python/600/360',
        },
    });
    //Aulas + materiais/avaliação
    const l1 = await prisma.lesson.upsert({
        where: { id: 1 },
        update: {},
        create: {
            courseId: alemAO.id,
            title: 'Pronúncia e alfabeto',
            order: 1,
            videoUrl: 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4', // demo
            isPublished: true,
        },
    });
    await prisma.material.upsert({
        where: { id: 1 },
        update: {},
        create: {
            lessonId: l1.id,
            filename: 'guia-pronuncia.pdf',
            path: '/uploads/demo/guia-pronuncia.pdf', // se servir estático em /uploads
        },
    });
    const eval1 = await prisma.evaluation.upsert({
        where: { id: 1 },
        update: {},
        create: {
            courseId: alemAO.id,
            lessonId: l1.id,
            title: 'Avaliação A1 - Aula 1',
            isPublished: true,
            // schema simples de formulário
            schemaJson: {
                fields: [
                    { name: 'q1', label: 'Traduza: “Guten Morgen”', type: 'text', required: true },
                    { name: 'q2', label: 'Como se pronuncia o “ch” em “Ich”?', type: 'text', required: true },
                ],
            },
        },
    });
    //Matrícula do aluno 
    await prisma.enrollment.upsert({
        where: { userId_courseId: { userId: alunoId, courseId: alemAO.id } },
        update: {},
        create: { userId: alunoId, courseId: alemAO.id },
    });
    //Evento (calendário)
    await prisma.event.upsert({
        where: { id: 1 },
        update: {},
        create: {
            courseId: alemAO.id,
            title: 'Aula ao vivo de conversação',
            startDatetime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            endDatetime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
            createdById: teacherId,
        },
    });
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
