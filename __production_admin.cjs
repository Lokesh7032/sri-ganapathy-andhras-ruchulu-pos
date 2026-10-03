const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

async function main() {

    const prisma = new PrismaClient();

    try {

        const username = process.env.SGAR_ADMIN_USERNAME;
        const password = process.env.SGAR_ADMIN_PASSWORD;

        if (!username || !password) {
            throw new Error("Admin credentials missing.");
        }

        const passwordHash =
            await bcrypt.hash(password, 12);

        const user =
            await prisma.user.upsert({

                where: {
                    username
                },

                update: {

                    name: "Main Admin",
                    passwordHash,
                    role: "SUPER_ADMIN",
                    active: true,
                    branchId: null
                },

                create: {

                    name: "Main Admin",
                    username,
                    passwordHash,
                    role: "SUPER_ADMIN",
                    active: true,
                    branchId: null
                }
            });

        console.log(
            JSON.stringify({
                id: user.id,
                username: user.username,
                role: user.role,
                active: user.active,
                branchId: user.branchId
            })
        );

    } finally {

        await prisma.$disconnect();
    }
}

main().catch(error => {

    console.error(error);
    process.exit(1);
});
