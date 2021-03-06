import { IOptionResult, IOptionRule, IOptionRuleSet } from "../api";
import { IDataNode } from "../api/data-node";
import { IValidationResult } from "../api/validation-result.interface";

export abstract class ConfigService<T> {

    protected configModel: T;

    private configOptions: IOptionRuleSet;

    constructor() {
        this.configModel   = this.getConfigModel();
        this.configOptions = this.getConfigRules();
    }

    /**
     * add multiple options
     *
     * @param {IDataNode} options
     * @memberof BuilderService
     */
    public setOptions(options: IDataNode, patch: boolean = false): IOptionResult[] {

        const cleanedOptions = this.cleanOptions(options);
        const optionResults  = this.validateOptions(cleanedOptions, patch);

        optionResults.forEach( (result) => {
            if ( result.errors.length === 0 ) {
                this.setOption(result.name, cleanedOptions[result.name]);
            }
        });

        return optionResults;
    }

    public getConfig(): T {
        return this.configModel;
    }

    protected abstract getConfigRules(): IOptionRuleSet;

    protected abstract getConfigModel(): T;

    /**
     * remove all options from source which are not defined in option ruleset
     *
     * @static
     * @param {IDataNode} source
     * @param {IOption} target
     * @returns {IDataNode}
     * @memberof OptionHelper
     */
    private cleanOptions( source: IDataNode): IDataNode {
        const filtered: IDataNode = { ...source };
        const validOptions = this.configOptions;

        Object.keys(source).forEach( (option) => {
            if (!validOptions[option] ) {
                delete filtered[option];
            }
        });
        return filtered;
    }

    /**
     * set new option to configuration model
     *
     * @private
     * @param {string} option
     * @param {*} value
     * @memberof BuilderService
     */
    private setOption(option: string, value: any) {
        // write configuration data to model
        const setterMethod = `set${option.charAt(0).toUpperCase()}${option.slice(1)}`;
        const methodExists = Object.prototype.toString.call(
            this.configModel[setterMethod]).slice(8, -1) === "Function";

        if (methodExists) {
            this.configModel[setterMethod](value);
        }
    }

    /**
     * loop all options from target (accepeted options) and return string array
     * with all errors
     *
     * @static
     * @param {IDataNode} source
     * @param {IOption} target
     * @memberof OptionHelper
     */
    private validateOptions(source: IDataNode, patch: boolean = false): IOptionResult[] {

        const options: IOptionRuleSet  = patch ? source : this.configOptions;
        const results: IOptionResult[] = [];

        Object.keys(options).forEach( (optionName) => {
            const rule: IOptionRule = this.configOptions[optionName];

            if ( ! rule.required && ! source.hasOwnProperty(optionName) ) {
                results.push({
                    errors: [],
                    name:  optionName,
                });
            } else {
                const optionValue: IDataNode = source[optionName];

                const validationResult = rule.required
                    ? this.validateRequiredOption(rule, optionValue)
                    : this.validateOption(rule, optionValue);

                results.push({
                    errors: ([] as string[]).concat(validationResult.error),
                    name:  optionName,
                });
            }
        });
        return results;
    }

    /**
     * validate a required option need an value
     *
     * @private
     * @param {IOptionRule} rule
     * @param {*} optionValue
     * @returns
     * @memberof ConfigService
     */
    private validateRequiredOption(rule: IOptionRule, optionValue: any): IValidationResult {
        if ( optionValue === undefined )  {
            return {
                error: ["required"],
                isValid: false,
            };
        }
        return this.validateOption(rule, optionValue);
    }

    /**
     * validate all options
     *
     * @private
     * @param {IOptionRule} rule
     * @param {*} value
     * @returns
     * @memberof ConfigService
     */
    private validateOption(rule: IOptionRule, value: any): IValidationResult {

        let validator = rule.validatorFn;
        const validationResults: IValidationResult[] = [];

        if ( ! validator ) {
            return { isValid: true, error: [] };
        }

        if ( ! Array.isArray(validator) ) {
            validator = [validator];
        }

        validator.forEach( (validatorFn) => {
            validationResults.push(validatorFn(value));
        });

        return validationResults.reduce( (previous, current): IValidationResult => {
            return {
                error: previous.error.concat(current.error),
                isValid: previous.isValid && current.isValid,
            };
        }, validationResults.shift());
    }
}
