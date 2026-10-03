const { PrismaClient } = require("@prisma/client");

async function main() {

    const prisma = new PrismaClient();

    try {

        const user =
            await prisma.user.findUnique({

                where: {
                    username: "admin"
                },

                select: {

                    id: true,
                    username: true,
                    name: true,
                    role: true,
                    active: true,
                    branchId: true
                }
            });

        if (!user) {
            throw new Error("admin user not found.");
        }

        if (!user.active) {
            throw new Error("admin user inactive.");
        }

        if (user.role !== "SUPER_ADMIN") {
            throw new Error(
                "admin role is not SUPER_ADMIN."
            );
        }

        console.log(JSON.stringify(user));

    } finally {

        await prisma.$disconnect();
    }
}

main().catch(error => {

    console.error(error);
    process.exit(1);
});
