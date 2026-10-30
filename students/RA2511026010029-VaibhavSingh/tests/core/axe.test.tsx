import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { BigIconTile } from '@/components/ui/BigIconTile';
import { Users, HardHat } from 'lucide-react';

describe('Accessibility WCAG AA Compliance (vitest-axe)', () => {
  it('passes axe accessibility on Button components', async () => {
    const { container } = render(
      <div>
        <Button variant="primary">Check in now</Button>
        <Button variant="secondary">View work receipt</Button>
      </div>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('passes axe accessibility on Field component with visible label & aria-describedby', async () => {
    const { container } = render(
      <Field
        id="test-input"
        label="Mobile Phone Number"
        helperText="Enter 10-digit phone number"
        placeholder="+91 98765 43210"
      />
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('passes axe accessibility on Field component in error state', async () => {
    const { container } = render(
      <Field
        id="test-input-error"
        label="Daily Wage (INR)"
        error="Statutory minimum wage violated"
      />
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('passes axe accessibility on Status Chips', async () => {
    const { container } = render(
      <div className="flex gap-2">
        <Chip status="PAID" label="PAID" />
        <Chip status="NEEDS_REVIEW" label="NEEDS REVIEW" />
        <Chip status="URGENT" label="URGENT" />
      </div>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('passes axe accessibility on BigIconTile touch targets', async () => {
    const { container } = render(
      <BigIconTile
        icon={<HardHat className="w-6 h-6" />}
        title="Metro Construction Corridor"
        subtitle="Line 4 civil works & excavation"
      />
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('passes axe accessibility on Glass Card containers', async () => {
    const { container } = render(
      <Card as="section" aria-label="Shift summary">
        <h2 className="text-lg font-bold">Shift Summary</h2>
        <p>Verified 8 hours logged.</p>
      </Card>
    );
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});

