// new RegExp('^function +([^\\(]+)\\(([^\\)]*)\\) *\\{([\\s\\S]*)\\}$', 'gm'),

export class DetailedArgument {
  static fromArgumentString(argumentString: string): DetailedArgument{
    const arg = new DetailedArgument('');
    argumentString = argumentString.trim();
    const argumentDetails = argumentString.split('=');
    arg.name = argumentDetails[0].trim();

    if(argumentDetails.length > 1) {
      arg.defaultValue = JSON.parse(argumentDetails[1].trim());
    }

    return arg;
  }

  constructor(
    public name: string,
    public defaultValue?: any
  ) {}

  toString(): string {
    return this.name + ((this.defaultValue !== void 0) ? (' = ' + JSON.stringify(this.defaultValue)) : '');
  }
}

export class DetailedArguments extends Array<DetailedArgument> {
  static fromArgumentsString(argumentsString: string): DetailedArguments {
    const detailedArguments = new DetailedArguments();

    const args = argumentsString.split(',');
    for(let i = 0; i < args.length; i++) {
      detailedArguments.push(DetailedArgument.fromArgumentString(args[i]));
    }

    return detailedArguments;
  }

  constructor() {
    super();
  }

  toString(indent: number = 0): string {
    const tab: string = '\t'.repeat(indent);
    return this.map((argument: DetailedArgument) => {
      return tab + argument.toString();
    }).join(', ');
  }
}

export class DetailedFunction {
  static fromFunction(fnc: Function): DetailedFunction {
    const detailedFunction = new DetailedFunction(fnc.name);
    const functionString = fnc.toString().trim();
    detailedFunction.isAsync = functionString.startsWith('async');
    detailedFunction.isArrow = !functionString.startsWith('function') && !detailedFunction.name;

    if(detailedFunction.isArrow) {
      const index = functionString.indexOf('=>');
      if(index < 0) throw new Error('Can\'t decrypt function');
      let argumentsString = functionString.slice(0, index);
      argumentsString = argumentsString.trim().replace(/^\(/, '').replace(/\)$/, '');
      detailedFunction.args = DetailedArguments.fromArgumentsString(argumentsString);

      let contentString = functionString.slice(index, functionString.length);
      contentString = contentString.trim().replace(/^=> *\{?([\s\S]*)\}?$/gm, '$1').trim();
      detailedFunction.content = contentString;
    } else {
      const fncRegExp = new RegExp('^(?:function|async) *([^\\(]*?) *\\(([\\s\\S]*?)\\) * \\{([\\s\\S]*?)\\}$', 'gm');//
      const match = fncRegExp.exec(functionString);
      if(match) {
        if(!detailedFunction.name) detailedFunction.name = match[1].trim();
        detailedFunction.args = DetailedArguments.fromArgumentsString(match[2].trim());
        detailedFunction.content = match[3].trim();
      }
    }

    return detailedFunction;
  }

  constructor(
    public name: string,
    public args: DetailedArguments = new DetailedArguments(),
    public content: string = '',
    public isArrow: boolean = false,
    public isAsync: boolean = false
  ) {}

  toString(): string {
    if(this.isArrow) {
      return '(' + this.args.toString() + ') => {\n' +
        '\t' + this.content +
      '\n}';
    } else {
      return 'function' + (this.name ? (' ' + this.name) : '') + '(' + this.args.toString() + ') {\n' +
        '\t' + this.content +
      '\n}';
    }
  }

  toFunction(): Function {
    const fncName = '_var_' + Math.random();
    eval('window[\'' + fncName +'\'] = ' + this.toString());
    const fnc = (<any>window)[fncName];
    delete (<any>window)[fncName];
    return fnc;
  }
}


// (() => {
//   // const fnc = new DetailedFunction('test');
//   // fnc.args.push(new DetailedArgument('arg_1', 'default'));
//   // fnc.content = 'console.log(arg_1);';
//   // fnc.isArrow = true;
//   // console.log(fnc.toString());
//
//   // let a = DetailedFunction.fromFunction((arg_1 = "default") => {
//   //   console.log(arg_1);
//   // });
//
//   // let a = DetailedFunction.fromFunction(a => {
//   //   console.log(a);
//   // });
//
//   let a = DetailedFunction.fromFunction(function test(arg_1 = "default") {
//     console.log(arg_1);
//   });
//
//   console.log(a, a.toString(), a.toFunction());
//
// })();

