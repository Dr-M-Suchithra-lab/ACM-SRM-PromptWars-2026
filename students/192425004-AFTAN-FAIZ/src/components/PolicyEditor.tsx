import { useState, type FormEvent } from "react";
import { Button } from "./ui/button";
import type { Policy } from "../../shared/engines";
import type { Language } from "../i18n";
export function PolicyEditor({
  policy,
  language,
  busy,
  onSave,
}: {
  policy: Policy;
  language: Language;
  busy: boolean;
  onSave: (policy: Policy, note: string) => void;
}) {
  const [basis, setBasis] = useState(policy.basis || "hourly");
  const label = (en: string, ta: string, hi: string) =>
    language === "ta" ? ta : language === "hi" ? hi : en;
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    onSave(
      {
        ...policy,
        basis: basis as "hourly" | "daily",
        hourly_paise: Math.round(Number(f.get("hourly")) * 100),
        daily_paise: Math.round(Number(f.get("daily")) * 100),
        regular_minutes: Math.round(Number(f.get("threshold")) * 60),
        overtime_bps: Math.round(Number(f.get("multiplier")) * 10000),
        min_rest_minutes: Math.round(Number(f.get("rest")) * 60),
        max_shift_minutes: Math.round(Number(f.get("maximum")) * 60),
        max_consecutive_days: Number(f.get("days")),
      },
      String(f.get("note")),
    );
  }
  return (
    <form className="form-stack" onSubmit={submit}>
      <h3>
        {label(
          "Configure pay policy",
          "ஊதியக் கொள்கையை அமைக்க",
          "वेतन नीति निर्धारित करें",
        )}
      </h3>
      <p className="caption">
        {label(
          "Verified shifts retain their original policy snapshot. Changes apply to work that has not yet been confirmed or linked to payroll. A daily rate is prorated over the configured regular hours.",
          "உறுதிப்படுத்திய பணிகளின் பழைய கொள்கை பாதுகாக்கப்படும். புதிய கொள்கை உறுதிப்படுத்தாத பணிகளுக்கு பொருந்தும். தினக்கூலி வழக்கமான நேரத்தின் அடிப்படையில் விகிதாசாரமாக கணக்கிடப்படும்.",
          "पुष्ट शिफ्टों की पुरानी नीति सुरक्षित रहती है। बदलाव अभी अपुष्ट और वेतन से असंबद्ध काम पर लागू होते हैं। दैनिक दर नियमित घंटों के अनुपात में गिनी जाती है।",
        )}
      </p>
      <label className="field">
        <span>Pay basis</span>
        <select
          aria-label="Pay basis"
          value={basis}
          onChange={(e) => setBasis(e.target.value as "hourly" | "daily")}
        >
          <option value="hourly">Hourly</option>
          <option value="daily">Daily · prorated</option>
        </select>
      </label>
      <div className="form-grid">
        <label className="field">
          <span>Hourly rate (₹)</span>
          <input
            aria-label="Hourly rate (₹)"
            name="hourly"
            type="number"
            step="0.01"
            min="0.01"
            max="100000"
            required
            defaultValue={policy.hourly_paise / 100}
          />
        </label>
        <label className="field">
          <span>Daily rate (₹)</span>
          <input
            aria-label="Daily rate (₹)"
            name="daily"
            type="number"
            step="0.01"
            min="0.01"
            max="1000000"
            required
            defaultValue={(policy.daily_paise || 80000) / 100}
          />
        </label>
      </div>
      <div className="form-grid">
        <label className="field">
          <span>Regular hours</span>
          <input
            aria-label="Regular hours"
            name="threshold"
            type="number"
            step="0.5"
            min="0.5"
            max="24"
            required
            defaultValue={policy.regular_minutes / 60}
          />
        </label>
        <label className="field">
          <span>Overtime multiplier</span>
          <input
            aria-label="Overtime multiplier"
            name="multiplier"
            type="number"
            step="0.05"
            min="1"
            max="5"
            required
            defaultValue={policy.overtime_bps / 10000}
          />
        </label>
      </div>
      <div className="form-grid">
        <label className="field">
          <span>Minimum rest (hours)</span>
          <input
            aria-label="Minimum rest (hours)"
            name="rest"
            type="number"
            step="0.5"
            min="0"
            max="48"
            required
            defaultValue={policy.min_rest_minutes / 60}
          />
        </label>
        <label className="field">
          <span>Maximum shift (hours)</span>
          <input
            aria-label="Maximum shift (hours)"
            name="maximum"
            type="number"
            step="0.5"
            min="1"
            max="24"
            required
            defaultValue={policy.max_shift_minutes / 60}
          />
        </label>
      </div>
      <label className="field">
        <span>Maximum consecutive days</span>
        <input
          aria-label="Maximum consecutive days"
          name="days"
          type="number"
          min="1"
          max="30"
          required
          defaultValue={policy.max_consecutive_days}
        />
      </label>
      <label className="field">
        <span>
          {label("Reason for change", "மாற்றத்திற்கான காரணம்", "बदलाव का कारण")}
        </span>
        <textarea
          name="note"
          aria-label="Reason for policy change"
          required
          minLength={10}
          maxLength={2000}
          rows={3}
        />
      </label>
      <Button type="submit" disabled={busy}>
        {label(
          "Save policy version",
          "கொள்கைப் பதிப்பைச் சேமி",
          "नीति संस्करण सहेजें",
        )}
      </Button>
    </form>
  );
}
