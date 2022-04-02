import { Task, TaskResultPack } from 'vitest';

// eslint-disable-next-line no-console
const print = (message: unknown, ...args: string[]) => console.info(message, ...args);

// See https://www.jetbrains.com/help/teamcity/service-messages.html#Supported+Test+ServiceMessages
const printSuiteStarted = (name: string) => print(`##teamcity[testSuiteStarted name='${name}']`);
const printTestStarted = (name: string) => print(`##teamcity[testStarted name='${name}']`);
const printTestFailed = (name: string, { message = '', details = '', actual = '', expected = '' }) =>
    print(
        `##teamcity[testFailed name='${name}' message='${message}' details='${details}' actual='${actual}' expected='${expected}' type='comparisonFailure']`
    );
const printTestIgnored = (name: string, message = '') => print(`##teamcity[testIgnored name='${name}' message='${message}']`);
const printTestFinished = (name: string, duration: number) => print(`##teamcity[testFinished name='${name}' duration='${duration}']`);
const printSuiteFinished = (name: string) => print(`##teamcity[testSuiteFinished name='${name}']`);

const escape = (str: string = ''): string => {
    return str
        .toString()
        .replace(/\x1B.*?m/g, '')
        .replace(/\|/g, '||')
        .replace(/\n/g, '|n')
        .replace(/\r/g, '|r')
        .replace(/\[/g, '|[')
        .replace(/\]/g, '|]')
        .replace(/\u0085/g, '|x')
        .replace(/\u2028/g, '|l')
        .replace(/\u2029/g, '|p')
        .replace(/'/g, "|'");
};
const buildTestName = (task: Task) => `${escape(task?.suite?.name)}: ${escape(task.name)}`;

const tasks: Map<string, Task> = new Map();
const printTask = (task: Task) => {
    if ('filepath' in task) {
        task.tasks.forEach(printTask);
    } else if (task.type === 'suite') {
        if (task.mode === 'run') {
            printSuiteStarted(task.name);
        }
        tasks.set(task.id, task);
        task.tasks.forEach(printTask);
    } else if (task.type === 'test') {
        const name = buildTestName(task);
        if (task.mode === 'skip') {
            printTestIgnored(name);
        }
        if (task.mode === 'run') {
            printTestStarted(name);
        }
        tasks.set(task.id, task);
    }
};

const printTaskResultPack = ([id, result]: TaskResultPack) => {
    if (tasks.has(id)) {
        const task = tasks.get(id);
        if (!task || !result) return;

        if (task.type === 'suite') {
            const name = escape(task.name);
            printSuiteFinished(name);
        } else {
            const name = buildTestName(task);
            switch (result.state) {
                case 'skip':
                    printTestIgnored(name);
                    break;
                case 'pass':
                    printTestFinished(name, result.duration ?? 0);
                    break;
                case 'fail':
                    printTestFailed(name, {
                        message: result.error?.message,
                        details: result.error?.stackStr,
                        actual: result.error?.actual,
                        expected: result.error?.expected,
                    });
                    break;
                default:
                    // do nothing
                    break;
            }
        }
    }
};

export { printTask, printTaskResultPack, print };
