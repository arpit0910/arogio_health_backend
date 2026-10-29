"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const configure_application_1 = require("./bootstrap/configure-application");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        bufferLogs: true,
        bodyParser: false,
    });
    const config = app.get(config_1.ConfigService);
    (0, configure_application_1.configureApplication)(app);
    await app.listen(config.getOrThrow('PORT'), '0.0.0.0');
}
void bootstrap();
//# sourceMappingURL=main.js.map