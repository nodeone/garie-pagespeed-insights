const { saveData, init } = require('./index');
const influx = require('./influx');

jest.mock('./influx', () => {
    return {
        getDatabaseNames: jest.fn(),
        createDatabase: jest.fn(),
        writePoints: jest.fn()
    };
});

describe('influxdb', () => {
    beforeEach(() => {
        influx.getDatabaseNames.mockClear();
        influx.createDatabase.mockClear();
        influx.writePoints.mockClear();
    });

    describe('init', () => {
        it('gets the names of the databases and creates a `pagespeed-insights` database if one does not already exist', async () => {
            influx.getDatabaseNames.mockResolvedValue(['database1', 'database2']);

            await init();

            expect(influx.createDatabase).toBeCalledWith('pagespeed-insights');
        });

        it('gets the names of the databases and does not create a `pagespeed-insights` database if one already exists', async () => {
            influx.getDatabaseNames.mockResolvedValue(['database1', 'pagespeed-insights']);

            await init();

            expect(influx.createDatabase).not.toHaveBeenCalled();
        });

        it('rejects when failing to get database names from influx', async () => {
            influx.getDatabaseNames.mockRejectedValue();

            return expect(init()).rejects.toMatch('Failed to initialise influx');
        });
    });

    describe('saveData', () => {
        it('writes influxdb points into the database for each property on a given object if it has values', async () => {
            const result = await saveData('https://www.test.com', { firstname: 'bob', lastname: 'bob' });

            expect(influx.writePoints).toHaveBeenCalledWith([
                {
                    measurement: 'firstname',
                    tags: {
                        url: 'https://www.test.com'
                    },
                    fields: {
                        value: 'bob'
                    }
                },
                {
                    measurement: 'lastname',
                    tags: {
                        url: 'https://www.test.com'
                    },
                    fields: {
                        value: 'bob'
                    }
                }
            ]);
        });

        it('does not write influxdb points into the database for any property that does not have a value', async () => {
            await saveData('https://www.test.com', { firstname: 'bob', lastname: undefined });

            expect(influx.writePoints).toBeCalledWith([
                {
                    measurement: 'firstname',
                    tags: {
                        url: 'https://www.test.com'
                    },
                    fields: {
                        value: 'bob'
                    }
                }
            ]);
        });

        it('rejects when writePoints fails to write into influxdb', async () => {
            influx.writePoints.mockRejectedValue();
            await expect(saveData('https://www.test.co.uk', { firstname: 'bob', lastname: undefined })).rejects.toEqual('Failed to save data into influxdb for https://www.test.co.uk');
        });
    });
});
