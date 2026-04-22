"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Category = "QUESTION" | "SUGGESTION" | "BUG" | "OTHER";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<Category>("QUESTION");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name || undefined,
        email: email || undefined,
        subject: subject || undefined,
        category,
        message,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(json.message ?? "Failed to send message.");
      return;
    }

    setSuccess("Thanks for your message. We review every submission and use it to improve Swap Ways.");
    setMessage("");
    setSubject("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-700">{success}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contactName">Name (optional)</Label>
          <Input
            id="contactName"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactEmail">Email (optional)</Label>
          <Input
            id="contactEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contactCategory">Category</Label>
        <select
          id="contactCategory"
          className="form-select w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
        >
          <option value="QUESTION">Question</option>
          <option value="SUGGESTION">Suggestion / Idea</option>
          <option value="BUG">Bug / Problem</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contactSubject">Subject (optional)</Label>
        <Input
          id="contactSubject"
          value={subject}
          maxLength={160}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Short summary"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contactMessage">Message</Label>
        <textarea
          id="contactMessage"
          className="min-h-36 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          minLength={10}
          maxLength={4000}
          required
          placeholder="Questions, ideas, and suggestions are welcome."
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Sending..." : "Send message"}
      </Button>
    </form>
  );
}
