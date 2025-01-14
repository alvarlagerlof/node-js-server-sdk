import Statsig from '..';
import { StatsigInitializeFromNetworkError, StatsigInitializeIDListsError } from '../Errors';
import LogEvent from '../LogEvent';
import { LoggerInterface } from '../StatsigOptions';

const logLevels = ['warn', 'error'] as ('warn' | 'error')[]
describe('Output Logger Interface', () => {
  it.each(logLevels)('verify calls to logger with log level %s', async (level) => {
    const warnings: unknown[] = [];
    const errors: unknown[] = [];
    const customLogger: LoggerInterface = {
      warn: (message?: any, ...optionalParams: any[]) => {
        warnings.push(message);
      },
      error: (message?: any, ...optionalParams: any[]) => {
        errors.push(message);
      },
      logLevel: level,
    };
    const secretKey = 'secret-key';
    await Statsig.initialize(secretKey, { logger: customLogger });
    // @ts-ignore
    Statsig.logEvent({ userID: '123' }, null);
    expect(errors.length).toEqual(level === 'error' ? 3 : 0);
    if (level === 'error') {
      expect(errors).toContainEqual('statsigSDK::logEvent> Must provide a valid string for the eventName.');
      expect(errors).toContainEqual(new StatsigInitializeFromNetworkError(new Error(`Request to https://api.statsigcdn.com/v1/download_config_specs/${secretKey}.json failed with status 401`)));
      expect(errors).toContainEqual(new StatsigInitializeIDListsError(new Error('Request to https://statsigapi.net/v1/get_id_lists failed with status 401')));
    }
    // @ts-ignore
    let event = new LogEvent(null);
    expect(errors.length).toEqual(level === 'error' ? 4 : 0);
    Statsig.shutdown();
    // @ts-ignore
    event = new LogEvent(null);
    expect(errors.length).toEqual(level === 'error' ? 4 : 0);
  });
});
