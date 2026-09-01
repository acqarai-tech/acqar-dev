import { useState } from 'react'
import { CaretUp, CaretDown, ChatCircle } from '@phosphor-icons/react'

// Reddit-style discussion widget — overall area vote, a comment composer,
// and a flat list of comments each with their own up/down vote. Local
// state only (no backend/auth yet): votes and new comments live for the
// session, matching the other demo-interactive pieces in this app (e.g.
// the chat login toggle). Swap for real accounts + persistence later.
function VoteControl({ score, myVote, onVote, size = 'md' }) {
  const iconSize = size === 'sm' ? 13 : 15
  return (
    <div className={`flex items-center gap-0.5 rounded-full border border-line bg-white ${size === 'sm' ? 'px-1 py-0.5' : 'px-1.5 py-1'}`}>
      <button
        type="button"
        aria-label="Upvote"
        onClick={() => onVote(myVote === 'up' ? null : 'up')}
        className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded-full transition-colors ${
          myVote === 'up' ? 'bg-accent text-white' : 'text-muted hover:bg-accent/10 hover:text-accent-dark'
        }`}
      >
        <CaretUp weight="bold" size={iconSize} />
      </button>
      <span className="min-w-[1.5rem] text-center text-xs font-semibold tabular-nums text-ink">{score}</span>
      <button
        type="button"
        aria-label="Downvote"
        onClick={() => onVote(myVote === 'down' ? null : 'down')}
        className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded-full transition-colors ${
          myVote === 'down' ? 'bg-ink/80 text-white' : 'text-muted hover:bg-ink/5 hover:text-ink'
        }`}
      >
        <CaretDown weight="bold" size={iconSize} />
      </button>
    </div>
  )
}

function timeAgo(hoursAgo) {
  if (hoursAgo < 1) return 'just now'
  if (hoursAgo < 24) return `${hoursAgo}h ago`
  return `${Math.round(hoursAgo / 24)}d ago`
}

export default function CommentSection({ areaName, seedComments, className = '' }) {
  const [areaScore, setAreaScore] = useState(12)
  const [areaVote, setAreaVote] = useState(null)
  const [comments, setComments] = useState(
    seedComments.map((c, i) => ({ ...c, id: i, myVote: null }))
  )
  const [draft, setDraft] = useState('')

  const castAreaVote = (vote) => {
    const delta = (vote === 'up' ? 1 : vote === 'down' ? -1 : 0) - (areaVote === 'up' ? 1 : areaVote === 'down' ? -1 : 0)
    setAreaScore((s) => s + delta)
    setAreaVote(vote)
  }

  const castCommentVote = (id, vote) => {
    setComments((list) =>
      list.map((c) => {
        if (c.id !== id) return c
        const delta = (vote === 'up' ? 1 : vote === 'down' ? -1 : 0) - (c.myVote === 'up' ? 1 : c.myVote === 'down' ? -1 : 0)
        return { ...c, score: c.score + delta, myVote: vote }
      })
    )
  }

  const handlePost = () => {
    if (!draft.trim()) return
    setComments((list) => [
      { id: Date.now(), name: 'You', initials: 'Y', hoursAgo: 0, text: draft.trim(), score: 1, myVote: 'up' },
      ...list,
    ])
    setDraft('')
  }

  return (
    <div className={`rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-md)] ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <VoteControl score={areaScore} myVote={areaVote} onVote={castAreaVote} />
          <p className="text-sm font-semibold text-ink">Discuss {areaName}</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <ChatCircle size={15} /> {comments.length}
        </span>
      </div>

      <div className="mt-4 flex gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fdf8f2] text-xs font-semibold text-accent-dark">
          Y
        </span>
        <div className="flex-1">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Join the conversation about ${areaName}…`}
            rows={2}
            className="w-full resize-none rounded-xl border border-line bg-[#fdf8f2] px-3.5 py-2.5 text-base text-ink placeholder:text-muted focus:border-accent/40 focus:outline-none sm:text-sm"
          />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-muted">
              Posting as <span className="font-semibold text-ink/70">You</span>
            </p>
            <button
              type="button"
              onClick={handlePost}
              disabled={!draft.trim()}
              className="cursor-pointer rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-white shadow-[var(--shadow-xs)] transition-all duration-200 hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Comment
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col divide-y divide-line border-t border-line">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3 py-3.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fdf8f2] text-xs font-semibold text-accent-dark">
              {c.initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="font-semibold text-ink">{c.name}</span>
                <span className="text-xs text-muted">{timeAgo(c.hoursAgo)}</span>
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-ink/80">{c.text}</p>
              <div className="mt-2">
                <VoteControl score={c.score} myVote={c.myVote} onVote={(v) => castCommentVote(c.id, v)} size="sm" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
