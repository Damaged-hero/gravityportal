import { useMemo } from 'react';
import { useIsAuthenticated } from '@azure/msal-react';
import { useDataverse } from './useDataverse';
import { useUserProfile } from './useUserProfile';
import { mapEnrollment } from './dataverseMapper';
import { mockTrainingRecords } from '../mock/trainingData';

const FIELDS = [
  'tct_enrollid',
  'tct_name',
  'grav_learnerid',
  'grav_time1',
  'grav_time2',
  'tct_assessmentstatus',
  'grav_certificatenumber',
  'grav_revalidationdate',
  'grav_country',
  '_grav_course_value',
  '_tct_company_value',
  '_tct_booking_value',
].join(',');

const ENROLL_ODATA  = `$select=${FIELDS}`;
const BOOKING_ODATA = '$select=grav_bookingid,tct_venueselect';

export function useTrainingRecords() {
  const isAuthenticated = useIsAuthenticated();
  const { isGravity, companyId, loading: profileLoading } = useUserProfile();

  const { data: enrollData, loading: enrollLoading, error: enrollError } =
    useDataverse(isAuthenticated ? 'tct_enrolls' : null, isAuthenticated ? ENROLL_ODATA : '');


  const { data: bookingData, loading: bookingLoading } =
    useDataverse(isAuthenticated ? 'grav_bookings' : null, isAuthenticated ? BOOKING_ODATA : '');

  const bookingMap = useMemo(() => {
    if (!bookingData) return {};
    const map = {};
    bookingData.forEach(b => {
      if (b.grav_bookingid) map[b.grav_bookingid] = b;
    });
    return map;
  }, [bookingData]);

  const records = useMemo(() => {
    if (!isAuthenticated) return mockTrainingRecords;
    if (!enrollData) return [];
    const mapped = enrollData.map((r, i) => mapEnrollment(r, i, bookingMap));
    // dev: expose raw status labels to verify mapping
    const rawLabels = [...new Set(enrollData.map(r => r['tct_assessmentstatus@OData.Community.Display.V1.FormattedValue']))];
    console.log('[Stats] raw status labels from Dataverse:', rawLabels);
    console.log('[Stats] mapped status counts:', mapped.reduce((acc, r) => { acc[r.status] = (acc[r.status]||0)+1; return acc; }, {}));
    // company users only see their own company's records
    if (!isGravity && companyId) {
      return mapped.filter(r => r.companyId === companyId);
    }
    return mapped;
  }, [isAuthenticated, enrollData, bookingMap, isGravity, companyId]);

  return {
    records,
    loading: isAuthenticated ? (enrollLoading || bookingLoading || profileLoading) : false,
    error: enrollError,
  };
}
