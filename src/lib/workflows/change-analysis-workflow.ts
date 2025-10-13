import type { Env } from '../env';

export class ChangeAnalysisWorkflow {
  async run(env: Env, payload: { job_id: string; from_snapshot_id: string; to_snapshot_id: string }): Promise<any> {
    const { job_id, from_snapshot_id, to_snapshot_id } = payload;

    try {
      const fromSnapshot = await env.DB.prepare('SELECT * FROM snapshots WHERE id = ?')
        .bind(from_snapshot_id).first();
      const toSnapshot = await env.DB.prepare('SELECT * FROM snapshots WHERE id = ?')
        .bind(to_snapshot_id).first();

      if (!fromSnapshot || !toSnapshot) {
        throw new Error('Snapshots not found');
      }

      const diff = {
        content_hash_changed: fromSnapshot.content_hash !== toSnapshot.content_hash,
        http_status_changed: fromSnapshot.http_status !== toSnapshot.http_status,
        etag_changed: fromSnapshot.etag !== toSnapshot.etag,
      };

      let semanticSummary = 'No significant changes detected';

      if (diff.content_hash_changed) {
        const analysisPrompt = `Analyze the changes between two job posting snapshots and provide a brief summary of what changed.`;

        const messages = [
          {
            role: 'system',
            content: 'You are an expert at analyzing job posting changes. Provide concise summaries of what changed between job postings.',
          },
          {
            role: 'user',
            content: `${analysisPrompt}\n\nContent hash changed: ${diff.content_hash_changed}\nHTTP status changed: ${diff.http_status_changed}`,
          },
        ];

        const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', { messages });
        semanticSummary = aiResponse.response || semanticSummary;
      }

      const changeId = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT INTO changes(id, job_id, from_snapshot_id, to_snapshot_id, diff_json, semantic_summary) VALUES(?,?,?,?,?,?)'
      ).bind(
        changeId,
        job_id,
        from_snapshot_id,
        to_snapshot_id,
        JSON.stringify(diff),
        semanticSummary
      ).run();

      return {
        change_id: changeId,
        job_id,
        diff,
        semantic_summary: semanticSummary,
      };
    } catch (error) {
      console.error('Change analysis workflow error:', error);
      throw error;
    }
  }
}
