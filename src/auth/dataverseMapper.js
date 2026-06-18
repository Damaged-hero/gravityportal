// Maps a raw tct_enrolls Dataverse record to the app's training record schema.

// tct_assessmentstatus option set values — confirm with your Dataverse admin if wrong
const STATUS_MAP = {
  1: 'Completed',        // Competent
  2: 'Failed',           // Not Yet Competent
  3: 'Pending',          // Enrolled / not yet assessed
  4: 'Pending',          // Other
};

function toDateStr(val) {
  if (!val) return null;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  } catch { return null; }
}

function mapStatus(raw, label) {
  // prefer the human-readable formatted value from the Prefer header
  if (label) {
    const l = label.toLowerCase().trim();
    if (['competent','completed','pass','passed'].includes(l)) return 'Completed';
    if (['not yet competent','nyc','failed','fail','did not finish'].includes(l)) return 'Failed';
  }
  if (raw == null) return 'Pending';
  if (typeof raw === 'number') return STATUS_MAP[raw] ?? 'Pending';
  const s = String(raw).toLowerCase().trim();
  if (['competent','completed','pass','passed','c','te','ate','te-gravity'].includes(s)) return 'Completed';
  if (['not yet competent','nyc','failed','fail','did not finish'].includes(s)) return 'Failed';
  return 'Pending';
}

export function mapEnrollment(raw, index, bookingMap = {}) {
  const booking = bookingMap[raw._tct_booking_value] ?? null;

  return {
    id:              raw.tct_enrollid ?? `dv-${index}`,
    candidateName:   raw.tct_name ?? '',
    idNumber:        raw.grav_learnerid ?? '',
    course:          raw['_grav_course_value@OData.Community.Display.V1.FormattedValue'] ?? '',
    companyId:       raw._tct_company_value ?? null,
    company:         raw['_tct_company_value@OData.Community.Display.V1.FormattedValue'] ?? null,
    trainingDate:    toDateStr(raw.grav_time1),
    endDate:         toDateStr(raw.grav_time2),
    status:          mapStatus(raw.tct_assessmentstatus, raw['tct_assessmentstatus@OData.Community.Display.V1.FormattedValue']),
    certificateNumber: raw.grav_certificatenumber ?? null,
    expiryDate:      toDateStr(raw.grav_revalidationdate),
    region:          raw.grav_country ?? '',
    venue:           booking?.['tct_venueselect@OData.Community.Display.V1.FormattedValue'] ?? null,
    submittedDate:   toDateStr(raw.grav_time1),
  };
}
