#!/usr/bin/env bash

TOKEN=$(gh auth token)

TITLE='mods: add `kasimeka@typist`'

OWNER="balatro-mod-index"
REPO="pr-creator"
BRANCH="mazen"

PARENT_SHA=$(
  curl https://api.github.com/repos/balatro-mod-index/pr-creator/git/ref/heads/main \
    -H "Authorization: token $TOKEN" |
    jq -r .object.sha
)

curl https://api.github.com/repos/balatro-mod-index/pr-creator/git/refs \
  -XPOST \
  -H "Authorization: token $TOKEN" \
  -d '{"ref":"refs/heads/'"$BRANCH"'","sha":"'"$PARENT_SHA"'"}'

DESCRIPTION_BLOB_SHA=$(
  curl https://api.github.com/repos/"$OWNER/$REPO"/git/blobs \
    -XPOST \
    -H "Authorization: token $TOKEN" \
    -d '{
      "content": "henlo fren :)",
      "encoding": "utf-8"
    }' | jq -r .sha
)

# Meta blob
META_BLOB_SHA=$(
  curl https://api.github.com/repos/"$OWNER/$REPO"/git/blobs \
    -XPOST \
    -H "Authorization: token $TOKEN" \
    -d '{
      "content": '"$(jq -c tojson <<<'{"title":"typist"}')"',
      "encoding": "utf-8"
    }' | jq -r .sha
)

THUMBNAIL_BLOB_SHA=$(
  curl https://api.github.com/repos/"$OWNER/$REPO"/git/blobs \
    -XPOST \
    -H "Authorization: token $TOKEN" \
    -d '{
      "content": "iVBORw0KGgoAAAANSUhEUgAAADIAAAAyAQMAAAAk8RryAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAZQTFRFAAAA////pdmf3QAAAJFJREFUeJxjZIAARmLoAw4Q+oEChP4gAKErOiC0zREgzV/YIPMERL9n4vsEpBn/MvF/BMmz/WL/CVHHXNsAphnrofR+B4g9B6D0AwUInbAAlS6YgEobXCBMM/+F0m8FIPQfRoi8/UGc+tDtgdkPcxfUnTB3w/wB8xfMnxB/MzDYHQLTzF85wPT/j5Bw+8eEGc4AwvQ0M1ro0x0AAAAASUVORK5CYII=",
      "encoding": "base64"
    }' | jq -r .sha
)

TREE_SHA=$(
  curl https://api.github.com/repos/"$OWNER/$REPO"/git/trees \
    -X POST \
    -H "Authorization: token $TOKEN" \
    -d '{
      "base_tree": "'"$PARENT_SHA"'",
      "tree": [
        {
          "path": "mods/kasimeka@typist/thumbnail.jpg",
          "mode": "100644",
          "type": "blob",
          "sha": "'"$THUMBNAIL_BLOB_SHA"'"
        },
        {
          "path": "mods/kasimeka@typist/description.md",
          "mode": "100644",
          "type": "blob",
          "sha": "'"$DESCRIPTION_BLOB_SHA"'"
        },
        {
          "path": "mods/kasimeka@typist/meta.json",
          "mode": "100644",
          "type": "blob",
          "sha": "'"$META_BLOB_SHA"'"
        }
      ]
    }' | jq -r .sha
)
NEW_COMMIT_SHA=$(
  # shellcheck disable=SC2016 # "`" is used as markdown style in commit message
  curl https://api.github.com/repos/"$OWNER/$REPO"/git/commits \
    -XPOST \
    -H "Authorization: token $TOKEN" \
    -d '{
      "message": "'"$TITLE"'",
      "author": {
        "name": "jim[bot]",
        "email": "jim[bot]@users.noreply.github.com"
      },
      "parents": ["'"$PARENT_SHA"'"],
      "tree": "'"$TREE_SHA"'"
    }' | jq -r .sha
)

curl https://api.github.com/repos/"$OWNER/$REPO/git/refs/heads/$BRANCH" \
  -XPATCH \
  -H "Authorization: token $TOKEN" \
  -d '{"force":true,"sha": "'"$NEW_COMMIT_SHA"'"}'

curl https://api.github.com/repos/"$OWNER/$REPO"/pulls \
  -XPOST \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "'"$TITLE"'",
    "head": "'"$BRANCH"'",
    "base": "main"
  }'
