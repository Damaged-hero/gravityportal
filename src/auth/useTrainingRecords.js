import { useMemo } from 'react';
import { useIsAuthenticated } from '@azure/msal-react';
import { useDataverse } from './useDataverse';
import { useUserProfile } from './useUserProfile';
import { mapEnrollment } from './dataverseMapper';
import { mockTrainingRecords } from '../mock/trainingData';

const FIELDS = [
  'tct_enrollid',
  '_tct_student_value',
  'grav_learnerid',
  'grav_time1',
  'grav_time2',
  'tct_assessmentstatus',
  'grav_certificatenumber',
  'grav_revalidationdate',
  '_grav_course_value',
  '_tct_company_value',
  '_tct_booking_value',
].join(',');

const ENROLL_ODATA  = `$select=${FIELDS}`;
const BOOKING_ODATA = '$top=5000&$select=grav_bookingid,tct_venueselect';

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
