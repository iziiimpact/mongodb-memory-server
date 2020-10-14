import * as tmp from 'tmp';
import fs from 'fs';
import os from 'os';
import MongoBinary, { LATEST_VERSION } from '../MongoBinary';
import MongoBinaryDownload from '../MongoBinaryDownload';

tmp.setGracefulCleanup();
jasmine.DEFAULT_TIMEOUT_INTERVAL = 600000;

const mockGetMongodPath = jest.fn().mockResolvedValue('/temp/path');

jest.mock('../MongoBinaryDownload', () => {
  return jest.fn().mockImplementation(() => {
    return { getMongodPath: mockGetMongodPath };
  });
});

describe('MongoBinary', () => {
  let tmpDir: tmp.DirResult;

  beforeEach(() => {
    tmpDir = tmp.dirSync({ prefix: 'mongo-mem-bin-', unsafeCleanup: true });
  });

  // cleanup
  afterEach(() => {
    tmpDir.removeCallback();
    (MongoBinaryDownload as jest.Mock).mockClear();
    mockGetMongodPath.mockClear();
    MongoBinary.cache = new Map();
  });

  describe('getPath', () => {
    it('should get system binary from the environment', async () => {
      const accessSpy = jest.spyOn(fs, 'access');
      process.env.MONGOMS_SYSTEM_BINARY = '/usr/local/bin/mongod';
      await MongoBinary.getPath();

      expect(accessSpy).toHaveBeenCalledWith('/usr/local/bin/mongod', expect.any(Function));

      accessSpy.mockClear();
      delete process.env.MONGOMS_SYSTEM_BINARY;
    });
  });

  describe('getDownloadPath', () => {
    it('should download binary and keep it in cache', async () => {
      const version = LATEST_VERSION;
      const binPath = await MongoBinary.getPath({
        downloadDir: tmpDir.name,
        version,
      });

      // eg. /tmp/mongo-mem-bin-33990ScJTSRNSsFYf/mongodb-download/a811facba94753a2eba574f446561b7e/mongodb-macOS-x86_64-3.5.5-13-g00ee4f5/
      expect(MongoBinaryDownload).toHaveBeenCalledWith({
        downloadDir: tmpDir.name,
        platform: os.platform(),
        arch: os.arch(),
        version,
        checkMD5: false,
      });

      expect(mockGetMongodPath).toHaveBeenCalledTimes(1);

      expect(MongoBinary.getCachePath(version)).toBeDefined();
      expect(MongoBinary.getCachePath(version)).toEqual(binPath);
    });
  });

  describe('getCachePath', () => {
    it('should get the cache', async () => {
      MongoBinary.cache.set('3.4.2', '/bin/mongod');
      expect(MongoBinary.getCachePath('3.4.2')).toEqual('/bin/mongod');
    });
  });

  describe('getSystemPath', () => {
    it('should use system binary if option is passed.', async () => {
      const accessSpy = jest.spyOn(fs, 'access');
      await MongoBinary.getSystemPath('/usr/bin/mongod'); // ignoring return, because this depends on the host system

      expect(accessSpy).toHaveBeenCalledWith('/usr/bin/mongod', expect.any(Function));

      accessSpy.mockClear();
    });
  });
});
