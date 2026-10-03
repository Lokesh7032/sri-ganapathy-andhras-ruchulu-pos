import {
  PrismaClient,
  Role
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username =
    process.env.INITIAL_ADMIN_USERNAME;

  const password =
    process.env.INITIAL_ADMIN_PASSWORD;

  const name =
    process.env.INITIAL_ADMIN_NAME ||
    "Main Admin";

  if (!username || !password) {
    throw new Error(
      "INITIAL_ADMIN_USERNAME and INITIAL_ADMIN_PASSWORD are required."
    );
  }

  if (password.length < 12) {
    throw new Error(
      "INITIAL_ADMIN_PASSWORD must be at least 12 characters."
    );
  }

  const hash =
    await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { username },
    update: {
      name,
      passwordHash: hash,
      role: Role.SUPER_ADMIN,
      active: true,
      branchId: null
    },
    create: {
      name,
      username,
      passwordHash: hash,
      role: Role.SUPER_ADMIN,
      active: true
    }
  });

  const branchName =
    process.env.INITIAL_BRANCH_NAME;

  const branchCode =
    process.env.INITIAL_BRANCH_CODE;

  const salesUsername =
    process.env.INITIAL_BRANCH_SALES_USERNAME;

  const salesPassword =
    process.env.INITIAL_BRANCH_SALES_PASSWORD;

  if (
    branchName &&
    branchCode &&
    salesUsername &&
    salesPassword
  ) {
    if (salesPassword.length < 12) {
      throw new Error(
        "INITIAL_BRANCH_SALES_PASSWORD must be at least 12 characters."
      );
    }

    const slug =
      branchName
        .toLowerCase()
        .trim()
        .replace(
          /[^a-z0-9]+/g,
          "-"
        )
        .replace(
          /^-+|-+$/g,
          ""
        );

    const branch =
      await prisma.branch.upsert({
        where: {
          code: branchCode
        },
        update: {
          name: branchName,
          slug,
          phone:
            process.env
              .INITIAL_BRANCH_PHONE ||
            "9490079466",
          receiptHeader:
            "SRI GANAPATHY ANDHRA'S RUCHULU"
        },
        create: {
          name: branchName,
          code: branchCode,
          slug,
          phone:
            process.env
              .INITIAL_BRANCH_PHONE ||
            "9490079466",
          receiptHeader:
            "SRI GANAPATHY ANDHRA'S RUCHULU",
          invoicePrefix:
            branchCode.toUpperCase()
        }
      });

    await prisma.user.upsert({
      where: {
        username: salesUsername
      },
      update: {
        name: `${branchName} Sales`,
        passwordHash:
          await bcrypt.hash(
            salesPassword,
            12
          ),
        role: Role.CASHIER,
        active: true,
        branchId: branch.id
      },
      create: {
        name: `${branchName} Sales`,
        username: salesUsername,
        passwordHash:
          await bcrypt.hash(
            salesPassword,
            12
          ),
        role: Role.CASHIER,
        active: true,
        branchId: branch.id
      }
    });

    const menu = [
      [
        "Andhra Meals",
        "Meals",
        "Rice, Sambar, Rasam, curries, papad, pickle",
        120,
        "8901"
      ],
      [
        "South Indian Meals",
        "Meals",
        "Rice, Sambar, curries, curd",
        100,
        "8902"
      ],
      [
        "Mini Meals",
        "Meals",
        "Small portion meals",
        80,
        "8903"
      ],
      [
        "Veg Biryani",
        "Biryani",
        "Vegetable biryani with raita",
        110,
        "8904"
      ],
      [
        "Chicken Biryani",
        "Biryani",
        "Chicken biryani with raita",
        150,
        "8905"
      ],
      [
        "Idli",
        "Tiffins",
        "Two idlis with chutney and sambar",
        35,
        "8906"
      ],
      [
        "Masala Dosa",
        "Tiffins",
        "Crispy dosa with potato masala",
        55,
        "8907"
      ],
      [
        "Chicken Curry",
        "Curries",
        "Chef special chicken curry",
        90,
        "8908"
      ],
      [
        "Paneer Curry",
        "Curries",
        "Paneer in rich gravy",
        85,
        "8909"
      ],
      [
        "Lemon Soda",
        "Beverages",
        "Fresh chilled lemon soda",
        50,
        "8910"
      ],
      [
        "Tea",
        "Beverages",
        "Hot tea",
        15,
        "8911"
      ],
      [
        "Coffee",
        "Beverages",
        "Hot coffee",
        20,
        "8912"
      ],
      [
        "Gulab Jamun",
        "Desserts",
        "Two pieces",
        35,
        "8913"
      ]
    ] as const;

    for (
      let i = 0;
      i < menu.length;
      i++
    ) {
      const [
        itemName,
        category,
        description,
        price,
        barcode
      ] = menu[i];

      await prisma.menuItem.upsert({
        where: {
          branchId_barcode: {
            branchId: branch.id,
            barcode
          }
        },
        update: {
          name: itemName,
          category,
          description,
          price,
          sortOrder: i,
          active: true
        },
        create: {
          name: itemName,
          category,
          description,
          price,
          barcode,
          sortOrder: i,
          branchId: branch.id
        }
      });
    }

    const benchCount =
      Number(
        process.env
          .INITIAL_BENCH_COUNT ||
          20
      );

    for (
      let i = 1;
      i <= benchCount;
      i++
    ) {
      const label =
        `Bench ${i}`;

      const token =
        `${branch.code}-BENCH-${String(
          i
        ).padStart(3, "0")}`;

      await prisma.bench.upsert({
        where: { token },
        update: {
          label,
          branchId: branch.id,
          active: true
        },
        create: {
          label,
          token,
          branchId: branch.id
        }
      });
    }
  }

  console.log(
    "Bootstrap complete."
  );
}

main()
  .catch((error) => {
    console.error(
      "Seed failed:",
      error
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

