## 🖥️ Proof of Errors (Real Debugging Log)

These are actual terminal screenshots captured while deploying this project on a fresh Ubuntu VM — included to document the real troubleshooting process, not a sanitized "it just worked" writeup.

<details>
<summary><strong>1. DATABASE_URL not found during schema push</strong></summary>
<br>
<img width="1316" height="521" alt="Screenshot 2026-07-13 235608" src="https://github.com/user-attachments/assets/98fcbe88-f7d3-4bfe-bdf8-12651a51551e" />

</details>

<details>
<summary><strong>2. drizzle-kit: command not found</strong></summary>
<br>
<img width="1252" height="397" alt="Screenshot 2026-07-13 235534" src="https://github.com/user-attachments/assets/2bb4f75b-0cfe-42c7-a164-9e48b071793b" /></details>


<details>
<summary><strong>3. TypeScript project reference build order failure</strong></summary>
<br>
<img width="1496" height="621" alt="Screenshot 2026-07-13 235411" src="https://github.com/user-attachments/assets/73d1292f-7bd3-46b5-95e5-ba5282c99781" /></details>

<details>
<summary><strong>4. Root build script failing on unrelated mockup-sandbox package</strong></summary>
<br>
<img width="1271" height="647" alt="Screenshot 2026-07-13 235553" src="https://github.com/user-attachments/assets/ccc64c07-517f-4be2-8d33-6a9f10b59eba" /></details>

<details>
<summary><strong>5. Vite build failing due to missing PORT env var</strong></summary>
<br>
<img width="1536" height="748" alt="Screenshot 2026-07-13 235404" src="https://github.com/user-attachments/assets/44d09bdb-11f3-4885-ac92-640324aab172" />

<details>
<summary><strong>6. systemd CHDIR permission denied</strong></summary>
<br>
<img width="970" height="586" alt="Screenshot 2026-07-13 235621" src="https://github.com/user-attachments/assets/d9696f03-0045-43ac-bcfc-27405885cf39" /></details>

<details>
<summary><strong>7. EACCES in node_modules/.vite-temp after accidental sudo pnpm</strong></summary>
<br>
<img src="https://github.com/user-attachments/assets/6b78ea4e-68e5-4884-97b4-96bc0a0f33d9" width="700">
</details>



Each issue above is documented in detail with root cause and fix in the [Challenges Solved](#-challenges-solved) section.
> If you're reviewing this project: these screenshots exist because I'd rather show the real debugging process than pretend everything worked on the first try.
> Errors aren't proof of failure — they're proof of the debugging that actually happened.
> Every one of these errors cost time and frustration — but each one taught something that no tutorial could: how production systems actually break, and how to reason through fixing them.
