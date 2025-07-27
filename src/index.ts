import * as crypto from "node:crypto";

import Fastify from "fastify";
import {type} from "arktype";

import createModSubmissionPr from "./github.ts";

const fastify = Fastify({logger: true});

const Submission = type({
  title: "string",
  author: "string",
  description: "string",
  thumbnail: "string",
});
type Submission = typeof Submission.infer;

fastify
  .get("/", async (_req, _res) => {})
  .post("/submit", async function handler(req, res) {
    const mod = Submission(req.body);
    if (mod instanceof type.errors) {
      res.status(400);
      return {error: "Invalid submission format", details: mod.summary};
    }

    const branchName = crypto
      .createHash("sha1")
      .update(JSON.stringify(mod, Object.keys(mod).sort()))
      .digest("base64");

    const result = await createModSubmissionPr(
      mod.title,
      mod.author,
      mod.description,
      mod.thumbnail,
      branchName,
    );
    if (result.isErr()) {
      res.status(500);
      return {
        error: "Failed to create mod submission PR",
        details: result.error,
      };
    }

    res.status(201);
    return {
      message: `Submission PR for ${mod.author}@${mod.title} created successfully`,
    };
  });

try {
  await fastify.listen({port: 3000});
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
