//used to hash the password in the db

const bcrypt = require("bcrypt");

async function main() {
    const password = "";

    const hash = await bcrypt.hash(password, 10);

    console.log(hash);
}

main();