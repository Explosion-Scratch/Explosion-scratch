import { Octokit } from "@octokit/rest";
import fs from "fs";

/*
ENV NEEDED:
~~~~~~~~~~~
API_KEY
API_BASE
API_MODEL
GITHUB_TOKEN
*/

async function getResponse(messages) {
  const apiKey = process.env.API_KEY;
  const apiBase = process.env.API_BASE;
  const apiUrl = apiBase + "/chat/completions";
  const data = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.API_MODEL,
      messages,
    }),
  }).then((r) => r.json());
  const answer = data.choices[0].message.content;
  return answer;
}

async function run() {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  let repos = await octokit
    .paginate(octokit.repos.listForUser, {
      username: "Explosion-Scratch",
      per_page: 100,
    })
    .then((repos) => repos.filter((repo) => repo.stargazers_count >= 12));
  for (let i in repos) {
    repos[i].emoji = await getResponse([
      {
        role: "system",
        content: `Generate a single emoji for a repo with the following title and description. Output only the emoji and nothing else`,
      },
      {
        role: "user",
        content: `Title: ${repos[i].name}\nDescription: ${repos[i].description}`,
      },
    ]);
    console.log("Generated emoji for", repos[i].name, repos[i].emoji);
    await new Promise((r) => setTimeout(r, 100));
  }
  const md = repos
    .map(
      // n## [${repo.name}](${repo.html_url})\n${repo.description || "No description"}\n
      (repo) =>
        `<li><a href=${JSON.stringify(repo.html_url)}>${repo.emoji} <b>${repo.name}</b></a>${repo.description?.trim()?.length ? `: <i>${repo.description || ""}</i>` : ""}</li>`,
    )
    .join("\n");

  const startContent = fs.readFileSync("start.md", "utf-8");
  const START_DELIM = "<!-- START -->";
  const END_DELIM = "<!-- END -->";
  const newContent =
    startContent.split(START_DELIM)[0] +
    `${START_DELIM}\n${md}\n${END_DELIM}`.split("\n").join("\t\n") +
    startContent.split(END_DELIM)[1];

  fs.writeFileSync("README.md", newContent);
}

run();
