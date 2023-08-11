import {PrismaClient} from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const user = await prisma.user.create({
        data: {
            ssoId: "bingbong"
        }
    })

    for (let i = 0; i <= 20; i++) {
        await prisma.buildTeam.create({
            data: {
                name: "BuildTeam " + i,
                slug: "bt-" + i,
                creator: {
                    connect: {
                        id: user.id,
                    },
                },
                members: {
                    connect: {
                        id: user.id,
                    },
                },
                location: "Random Location " + i,
                icon: "https://cdn.streamp.live/static/76bb9f20-812c-46f1-9eea-1d23e64666d7.gif",
                invite: "https://buildthe.earth/de",
                about: "We build the earth",
                backgroundImage:
                    "https://cdn.streamp.live/static/76bb9f20-812c-46f1-9eea-1d23e64666d7.gif",
                socials: {
                    create: {
                        name: "Discord" + i,
                        icon: "discord",
                        url: "https://discord.gg/buildtheearth",
                    },
                },
                applicationQuestions: {
                    create: {
                        title: "How are you?",
                        subtitle: "Honestly",
                        placeholder: "Great",
                        required: true,
                        type: "SHORT_INPUT",
                        icon: "question",
                        sort: 0,
                    },
                },
            },
        });
        await prisma.fAQQuestion.create({
            data: {question: "Question " + i, answer: "Answer " + i},
        });

        if (i <= 6) {
            await prisma.contact.create({
                data: {
                    name: "Contact " + i,
                    email: `contact${i}@buildtheearth.net`,
                    role: "Owner",
                },
            });
        }
    }


}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
