const path = require("path");
const readline = require("readline/promises");
const { stdin, stdout } = require("node:process");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const User = require("../models/User");
const { promoteExistingUser } = require("../services/adminPromotion");

async function main() {
    if (!stdin.isTTY || !stdout.isTTY) {
        throw new Error("Run this setup command from an interactive terminal.");
    }
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI is not configured in backend/.env or the process environment.");
    }

    const prompt = readline.createInterface({ input: stdin, output: stdout });
    try {
        const email = (await prompt.question("Email of the existing Saarthi account to promote: ")).trim().toLowerCase();
        if (process.env.NODE_ENV === "production") {
            const productionConfirmation = await prompt.question("Type PROMOTE PRODUCTION ADMIN to confirm this production change: ");
            if (productionConfirmation !== "PROMOTE PRODUCTION ADMIN") {
                throw new Error("Production administrator promotion was not confirmed.");
            }
        }

        const confirmation = await prompt.question(`Grant administrator access to ${email}? Type PROMOTE to continue: `);
        if (confirmation !== "PROMOTE") {
            throw new Error("Administrator promotion was not confirmed.");
        }

        await mongoose.connect(process.env.MONGODB_URI);
        const result = await promoteExistingUser(User, email);
        if (result.status === "invalid_email") throw new Error("Enter a valid account email address.");
        if (result.status === "not_found") throw new Error("No existing Saarthi account matches that email. Register the account first, then run this command again.");
        if (result.status === "inactive") throw new Error("That account is blocked. Restore its active status before granting administrator access.");
        if (result.status === "changed") throw new Error("The account changed during promotion. Review its current role and retry if appropriate.");
        if (result.status === "already_admin") {
            stdout.write("That account already has administrator access.\n");
            return;
        }
        stdout.write(`Administrator access granted to ${result.user.email}. The account password was not changed. Sign out and back in to refresh the administrator session.\n`);
    } finally {
        prompt.close();
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    }
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
