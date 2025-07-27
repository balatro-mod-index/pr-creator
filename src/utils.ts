import {err, ok, ResultAsync} from "neverthrow";
import {ArkErrors, type, type Type} from "arktype";

export namespace Fetch {
  export type Error<E> = RequestError | HttpError<E> | ParseError;
  export type RequestError = {type: "request"; error: globalThis.Error};
  export type ParseError = {type: "parse"; error: globalThis.Error | ArkErrors};
  export type HttpError<E = unknown> = {
    type: "http";
    status: number;
    json?: E;
    headers: Headers;
  };

  export const fetch = <T = unknown>(
    input: URL | string,
    init?: RequestInit,
    schema?: Type<T>,
  ): ResultAsync<{status: number; headers: Headers; json: T}, Error<unknown>> =>
    ResultAsync.fromPromise(globalThis.fetch(input, init), e => ({
      type: "request" as const,
      error:
        e instanceof globalThis.Error ? e : new globalThis.Error(String(e)),
    })).andThen(response =>
      response.ok
        ? ResultAsync.fromPromise(response.json(), e => ({
            type: "parse" as const,
            error:
              e instanceof globalThis.Error
                ? e
                : new globalThis.Error(String(e)),
          }))
            .map(schema || (x => x))
            .andThen(result =>
              result instanceof type.errors
                ? err({type: "parse" as const, error: result})
                : ok({
                    status: response.status,
                    json: result as T,
                    headers: response.headers,
                  }),
            )
        : ResultAsync.fromSafePromise(
            response.json().catch(() => undefined),
          ).andThen(json =>
            err({
              type: "http" as const,
              status: response.status,
              json,
              headers: response.headers,
            }),
          ),
    );
}
