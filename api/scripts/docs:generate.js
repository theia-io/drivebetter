// scripts/docs:generate.js
import swaggerJsdoc from "swagger-jsdoc";
import fs from "fs";

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "DriveBetter API",
            version: "1.0.0",
            description: "OpenAPI specification for DriveBetter",
        },
        servers: [{ url: "/api/v1" }],
    },
    apis: ["./src/routes/**/*.ts", "./src/models/*.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

fs.writeFileSync("./openapi.json", JSON.stringify(swaggerSpec, null, 2));
console.log("✅ OpenAPI spec generated at ./openapi.json");
