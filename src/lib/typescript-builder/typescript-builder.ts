import { ChildProcess } from "child_process";
import { resolve } from "path";
import { Config, IDataNode } from "rh-utils";
import { IBuilder } from "../../api";
import { AppConfigProperties } from "../../model";
import { OptionHelper } from "../../services";
import { TypescriptOption } from "./model/data/typescript.options";
import { TypescriptService } from "./service/typescript.service";

/**
 * builder to compile typescript and copy
 * all binary files (html, images, fonts) to dist folder
 *
 * @export
 * @class TypescriptBuilder
 * @implements {IBuilder}
 */
export class TypescriptBuilder implements IBuilder {

    /**
     * typescript service
     *
     * @private
     * @type {TypescriptService}
     * @memberof TypescriptBuilder
     */
    private typescriptService: TypescriptService;

    /**
     * global app config
     *
     * @private
     * @type {Config}
     * @memberof TypescriptBuilder
     */
    private appConfig: Config;

    /**
     * Creates an instance of TypescriptBuilder.
     *
     * @memberof TypescriptBuilder
     */
    constructor() {
        this.appConfig  = Config.getInstance();
        this.typescriptService = TypescriptService.getInstance();
        this.initialize();
    }

    /**
     * config was passed
     *
     * @param {*} config
     * @memberof TypescriptBuilder
     */
    public configure(config: IDataNode): void {
        const options: IDataNode = OptionHelper.cleanOptions(config, TypescriptOption);
        const errors: string[]   = OptionHelper.validateOptions(config, TypescriptOption);

        if ( ! errors.length || Object.keys(options).length ) {
            for (const name in options) {
                if ( options.hasOwnProperty(name) ) {
                    this.typescriptService.setOption(name, options[name]);
                }
            }
        }
    }

    /**
     * run process
     *
     * @returns {Promise<string>}
     * @memberof TypescriptBuilder
     */
    public run(): Promise<string> {

        return new Promise( (success, error) => {
            const process: ChildProcess = this.typescriptService.createTsProcess();
            let tsOut: string = "";

            process.stdout.on("data", (chunk: Buffer) => {
                tsOut = tsOut.concat(chunk.toString());
            });

            process.on("close", () => {
                if ( this.hasError(tsOut) ) {
                    return error(tsOut);
                }
                return success(tsOut);
            });
        });
    }

    /**
     * initialize typescript configuration
     *
     * @protected
     * @memberof TypescriptBuilder
     */
    protected initialize() {
        const appRoot    = this.appConfig.get(AppConfigProperties.appRoot);
        const config     = this.typescriptService.getConfig();
        const sourceRoot = this.appConfig.get(AppConfigProperties.sourceRoot);

        config.setProjectSource(sourceRoot);
        config.setNodePackageTS(resolve(appRoot, "../node_modules/typescript/lib/tsc"));
    }

    /**
     * check typescript response got an error
     *
     * @private
     * @param {string} tsData
     * @returns {boolean}
     * @memberof TypescriptBuilder
     */
    private hasError(tsData: string): boolean {
        if ( tsData.match(/^error/) ) {
            return true;
        }
        return false;
    }
}
