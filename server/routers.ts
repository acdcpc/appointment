import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { z } from "zod";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  clinician: router({
    access: adminProcedure.query(({ ctx }) => ({
      allowed: true,
      clinicianName: ctx.user.name ?? "Associate Professor Dr. Anil Ojha",
    })),
    draftFromConsultation: adminProcedure
      .input(z.object({ consultationNote: z.string().trim().min(20).max(6000) }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          model: "gpt-5-mini",
          maxTokens: 700,
          messages: [
            {
              role: "system",
              content: "You are a clinician documentation assistant. Summarize only the supplied consultation note. Never diagnose, calculate doses, recommend medicines, infer contraindications, or invent treatment. Extract a medication name and directions only when they are explicitly written in the note. Return a draft that requires clinician review before any record is saved.",
            },
            { role: "user", content: `Consultation note:\n${input.consultationNote}` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "clinician_review_draft",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  summary: { type: "string" },
                  medication: { type: "string" },
                  instructions: { type: "string" },
                  reviewFlags: { type: "array", items: { type: "string" } },
                },
                required: ["summary", "medication", "instructions", "reviewFlags"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = response.choices[0]?.message.content;
        if (typeof content !== "string") throw new Error("The AI draft response was empty.");
        const draft = JSON.parse(content) as { summary: string; medication: string; instructions: string; reviewFlags: string[] };
        return {
          ...draft,
          reviewFlags: ["AI-assisted draft only — clinician review and approval are required.", ...draft.reviewFlags],
        };
      }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
