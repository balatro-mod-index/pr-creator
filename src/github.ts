const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
  throw new Error("required env var `GITHUB_TOKEN` is not set");
}
const headers = {Authorization: `Bearer ${GITHUB_TOKEN}`};
const owner = process.env.REPO_OWNER || "balatro-mod-index";
const repo = process.env.REPO_NAME || "pr-creator";

import {err, ok, ResultAsync, safeTry} from "neverthrow";
import {match, type} from "arktype";

import {Fetch} from "./utils.js";

type errorTag =
  | "getMainBranch"
  | "createBranchRef"
  | "createDescriptionBlob"
  | "createMetaBlob"
  | "createThumbnailBlob"
  | "createTreeCommit"
  | "createCommit"
  | "updateBranchRef"
  | "createPr";
const attachErrorTag = (tag: errorTag) => (error: any) => ({tag, error});

export default function createModSubmissionPr(
  title: string,
  author: string,
  description: string,
  thumbnail: string,
  branchName: string,
): ResultAsync<null, {tag: errorTag; error: Fetch.Error<unknown>}> {
  const id = `${author}@${title}`;
  const prTitle = "mods: add `" + id + "`";
  return safeTry(async function* () {
    const {
      json: {
        object: {sha: parentSha},
      },
    } = yield* await Fetch.fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/main`,
      {headers, method: "GET"},
      type({object: {sha: "string"}}),
    ).mapErr(attachErrorTag("getMainBranch"));

    yield* await Fetch.fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs`,
      {
        headers,
        method: "POST",
        body: JSON.stringify({ref: `refs/heads/${branchName}`, sha: parentSha}),
      },
    )
      .orElse(
        match
          .case(
            {status: "422", json: {message: "'Reference already exists'"}},
            ok,
          )
          .default(err),
      )
      .mapErr(attachErrorTag("createBranchRef"));

    const {
      json: {sha: descriptionBlobSha},
    } = yield* await Fetch.fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
      {
        headers,
        method: "POST",
        body: JSON.stringify({encoding: "utf-8", content: description}),
      },
      type({sha: "string"}),
    ).mapErr(attachErrorTag("createDescriptionBlob"));

    const {
      json: {sha: metaBlobSha},
    } = yield* await Fetch.fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
      {
        headers,
        method: "POST",
        body: JSON.stringify({
          encoding: "utf-8",
          content: JSON.stringify({title}),
        }),
      },
      type({sha: "string"}),
    ).mapErr(attachErrorTag("createMetaBlob"));

    const {
      json: {sha: thumbnailBlobSha},
    } = yield* await Fetch.fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
      {
        headers,
        method: "POST",
        body: JSON.stringify({
          encoding: "base64",
          content: thumbnail,
        }),
      },
      type({sha: "string"}),
    ).mapErr(attachErrorTag("createThumbnailBlob"));

    const {
      json: {sha: treeCommitSha},
    } = yield* await Fetch.fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees`,
      {
        headers,
        method: "POST",
        body: JSON.stringify({
          base_tree: parentSha,
          tree: [
            {
              path: `mods/${id}/thumbnail.jpg`,
              sha: thumbnailBlobSha,
              mode: "100644",
              type: "blob",
            },
            {
              path: `mods/${id}/description.md`,
              sha: descriptionBlobSha,
              mode: "100644",
              type: "blob",
            },
            {
              path: `mods/${id}/meta.json`,
              sha: metaBlobSha,
              mode: "100644",
              type: "blob",
            },
          ],
        }),
      },
      type({sha: "string"}),
    ).mapErr(attachErrorTag("createTreeCommit"));

    const {
      json: {sha: newCommitSha},
    } = yield* await Fetch.fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/commits`,
      {
        headers,
        method: "POST",
        body: JSON.stringify({
          message: `Add mod ${id}`,
          author: {
            name: "jim[bot]",
            email: "jim[bot]@users.noreply.github.com",
          },
          tree: treeCommitSha,
          parents: [parentSha],
        }),
      },
      type({sha: "string"}),
    ).mapErr(attachErrorTag("createCommit"));

    yield* await Fetch.fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branchName}`,
      {
        headers,
        method: "PATCH",
        body: JSON.stringify({force: true, sha: newCommitSha}),
      },
    ).mapErr(attachErrorTag("updateBranchRef"));

    yield* await Fetch.fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        headers,
        method: "POST",
        body: JSON.stringify({
          title: prTitle,
          head: branchName,
          base: "main",
        }),
      },
    )
      .orElse(
        match
          .case(
            {
              status: "422",
              json: {
                errors: [
                  {
                    message: `'A pull request already exists for ${owner}:${branchName}.'`,
                  },
                ],
              },
            },
            ok,
          )
          .default(err),
      )
      .mapErr(attachErrorTag("createPr"));

    return ok(null);
  });
}
