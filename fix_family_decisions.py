from pathlib import Path
import shutil

page = Path("caresphere_frontend/app/family-decisions/page.js")

backup = Path("caresphere_frontend/app/family-decisions/page.backup.js")

if not page.exists():
    raise SystemExit("ERROR: family-decisions/page.js was not found.")

text = page.read_text(encoding="utf-8")

if "function isVotingDeadlinePassed" in text:
    raise SystemExit("The deadline fix already exists. Nothing changed.")

shutil.copy2(page, backup)

print("Backup created:", backup)


def change(old, new, name):
    global text

    if old not in text:
        raise SystemExit(
            f"STOPPED: Could not find {name}. " "Your page.js has NOT been changed."
        )

    text = text.replace(old, new, 1)

    print("OK:", name)


# --------------------------------------------------
# 1. Add deadline helper
# --------------------------------------------------

old = """function statusClasses(status) {"""

new = """function isVotingDeadlinePassed(decision) {
  if (!decision?.voting_deadline) {
    return false;
  }

  const deadline =
    new Date(decision.voting_deadline);

  if (Number.isNaN(deadline.getTime())) {
    return false;
  }

  return Date.now() > deadline.getTime();
}


function statusClasses(status) {"""

change(
    old,
    new,
    "deadline checker",
)


# --------------------------------------------------
# 2. Stop expired votes
# --------------------------------------------------

old = """      const chosenOption =
        selectedVotes[
          decision.id
        ];"""

new = """      if (
        decision.status !== "voting" ||
        isVotingDeadlinePassed(decision)
      ) {
        setError(
          "Voting is closed for this decision."
        );

        return;
      }

      const chosenOption =
        selectedVotes[
          decision.id
        ];"""

change(
    old,
    new,
    "expired vote protection",
)


# --------------------------------------------------
# 3. Fix Voting summary
# --------------------------------------------------

old = """          (decision) =>
            decision.status ===
            "voting"
        ).length,"""

new = """          (decision) =>
            decision.status ===
              "voting" &&
            !isVotingDeadlinePassed(
              decision
            )
        ).length,"""

change(
    old,
    new,
    "Voting summary count",
)


# --------------------------------------------------
# 4. Add deadline state to every card
# --------------------------------------------------

old = """                    const selectedVote =
                      selectedVotes[
                        decision.id
                      ];"""

new = """                    const selectedVote =
                      selectedVotes[
                        decision.id
                      ];

                    const deadlinePassed =
                      isVotingDeadlinePassed(
                        decision
                      );

                    const isVotingOpen =
                      decision.status ===
                        "voting" &&
                      !deadlinePassed;"""

change(
    old,
    new,
    "decision deadline state",
)


# --------------------------------------------------
# 5. Stop selecting options after deadline
# --------------------------------------------------

old = """                                  const canSelect =
                                    decision.status ===
                                      "voting" &&
                                    canVote &&
                                    !hasVoted;"""

new = """                                  const canSelect =
                                    isVotingOpen &&
                                    canVote &&
                                    !hasVoted;"""

change(
    old,
    new,
    "option protection",
)


# --------------------------------------------------
# 6. Only show voting controls when truly open
# --------------------------------------------------

old = """                        {decision.status ===
                          "voting" && ("""

new = """                        {isVotingOpen && ("""

change(
    old,
    new,
    "voting panel",
)


# --------------------------------------------------
# 7. Add Voting closed message
# --------------------------------------------------

old = """                        {/* RESOLVED */}"""

new = """                        {/* DEADLINE PASSED */}

                        {decision.status ===
                          "voting" &&
                          deadlinePassed && (

                          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">

                            <div className="flex items-start gap-3">

                              <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />

                              <div>

                                <p className="font-black text-slate-800">
                                  Voting closed
                                </p>

                                <p className="mt-1 text-sm leading-6 text-slate-600">
                                  The voting deadline has passed. No further votes can be cast on this decision.
                                </p>

                                {hasVoted && (

                                  <p className="mt-3 text-sm font-bold text-emerald-700">
                                    Your recorded vote remains saved.
                                  </p>

                                )}

                              </div>

                            </div>

                          </div>

                        )}


                        {/* RESOLVED */}"""

change(
    old,
    new,
    "Voting closed message",
)


# --------------------------------------------------
# Save only after every check passes
# --------------------------------------------------

page.write_text(
    text,
    encoding="utf-8",
)

print()
print("SUCCESS")
print("Family Decisions deadline handling fixed.")
print()
print("Original backup:")
print(backup)
