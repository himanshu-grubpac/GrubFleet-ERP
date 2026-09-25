import serverlessExpress from '@codegenie/serverless-express';
import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import type { Application } from 'express';
import { createNestApplication } from './bootstrap-app';

type ApiGatewayHandler = (
  event: APIGatewayProxyEventV2,
  context: Context,
) => Promise<unknown>;

let cachedHandler: ApiGatewayHandler | undefined;

export const handler: ApiGatewayHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (!cachedHandler) {
    const nestApp = await createNestApplication();
    await nestApp.init();
    const expressApp = nestApp.getHttpAdapter().getInstance() as Application;
    cachedHandler = serverlessExpress({
      app: expressApp,
    }) as unknown as ApiGatewayHandler;
  }

  return cachedHandler(event, context);
};
