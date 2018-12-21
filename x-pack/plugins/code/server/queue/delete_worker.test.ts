/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import sinon from 'sinon';
import { AnyObject, EsClient, Esqueue } from '../lib/esqueue';

import { Log } from '../log';
import { LspService } from '../lsp/lsp_service';
import { RepositoryServiceFactory } from '../repository_service_factory';
import { SocketService } from '../socket_service';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';
import { CancellationSerivce } from './cancellation_service';
import { DeleteWorker } from './delete_worker';

const log: Log = (new ConsoleLoggerFactory().getLogger(['test']) as any) as Log;

const emptyAsyncFunc = async (_: AnyObject): Promise<any> => {
  Promise.resolve({});
};

const esQueue = {};

afterEach(() => {
  sinon.restore();
});

test('Execute delete job.', async () => {
  // Setup SocketService
  const broadcastDeleteProgressSpy = sinon.spy();
  const socketService = {
    broadcastDeleteProgress: emptyAsyncFunc,
  };
  socketService.broadcastDeleteProgress = broadcastDeleteProgressSpy;

  // Setup RepositoryService
  const removeSpy = sinon.fake.returns(Promise.resolve());
  const repoService = {
    remove: emptyAsyncFunc,
  };
  repoService.remove = removeSpy;
  const repoServiceFactory = {
    newInstance: (): void => {
      return;
    },
  };
  const newInstanceSpy = sinon.fake.returns(repoService);
  repoServiceFactory.newInstance = newInstanceSpy;

  // Setup CancellationService
  const cancelIndexJobSpy = sinon.spy();
  const cancellationService = {
    cancelIndexJob: emptyAsyncFunc,
  };
  cancellationService.cancelIndexJob = cancelIndexJobSpy;

  // Setup EsClient
  const deleteSpy = sinon.fake.returns(Promise.resolve());
  const esClient = {
    indices: {
      delete: emptyAsyncFunc,
    },
  };
  esClient.indices.delete = deleteSpy;

  // Setup LspService
  const deleteWorkspaceSpy = sinon.fake.returns(Promise.resolve());
  const lspService = {
    deleteWorkspace: emptyAsyncFunc,
  };
  lspService.deleteWorkspace = deleteWorkspaceSpy;

  const deleteWorker = new DeleteWorker(
    esQueue as Esqueue,
    log,
    esClient as EsClient,
    (cancellationService as any) as CancellationSerivce,
    (lspService as any) as LspService,
    (repoServiceFactory as any) as RepositoryServiceFactory,
    (socketService as any) as SocketService
  );

  await deleteWorker.executeJob({
    payload: {
      uri: 'github.com/elastic/kibana',
      dataPath: 'mockpath',
    },
    options: {},
  });

  expect(broadcastDeleteProgressSpy.calledTwice).toBeTruthy();
  expect(broadcastDeleteProgressSpy.getCall(0).args[1]).toEqual(0);
  expect(broadcastDeleteProgressSpy.getCall(1).args[1]).toEqual(100);

  expect(cancelIndexJobSpy.calledOnce).toBeTruthy();

  expect(newInstanceSpy.calledOnce).toBeTruthy();
  expect(removeSpy.calledOnce).toBeTruthy();

  expect(deleteSpy.calledThrice).toBeTruthy();

  expect(deleteWorkspaceSpy.calledOnce).toBeTruthy();
});

test('On delete job enqueued.', async () => {
  // Setup EsClient
  const indexSpy = sinon.fake.returns(Promise.resolve());
  const esClient = {
    index: emptyAsyncFunc,
  };
  esClient.index = indexSpy;

  const deleteWorker = new DeleteWorker(
    esQueue as Esqueue,
    log,
    esClient as EsClient,
    {} as CancellationSerivce,
    {} as LspService,
    {} as RepositoryServiceFactory,
    {} as SocketService
  );

  await deleteWorker.onJobEnqueued({
    payload: {
      uri: 'github.com/elastic/kibana',
      dataPath: 'mockpath',
    },
    options: {},
  });

  expect(indexSpy.calledOnce).toBeTruthy();
});

test('On delete job completed.', async () => {
  // Setup EsClient
  const updateSpy = sinon.fake.returns(Promise.resolve());
  const esClient = {
    update: emptyAsyncFunc,
  };
  esClient.update = updateSpy;

  const deleteWorker = new DeleteWorker(
    esQueue as Esqueue,
    log,
    esClient as EsClient,
    {} as CancellationSerivce,
    {} as LspService,
    {} as RepositoryServiceFactory,
    {} as SocketService
  );

  await deleteWorker.onJobCompleted(
    {
      payload: {
        uri: 'github.com/elastic/kibana',
        dataPath: 'mockpath',
      },
      options: {},
    },
    {
      uri: 'github.com/elastic/kibana',
    }
  );

  // Nothing is called.
  expect(updateSpy.notCalled).toBeTruthy();
});