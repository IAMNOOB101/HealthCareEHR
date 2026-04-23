import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPatients } from '../store/slices/patientSlice';
import { User, Phone, Mail, MapPin, Heart, ShieldCheck, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardBody, Spinner } from '../components/ui';
import { format, differenceInYears } from 'date-fns';

const InfoRow = ({ label, value }) => (
  <div className="flex gap-4 py-2.5 border-b border-border/40 last:border-0">
    <dt className="text-sm text-muted-foreground w-40 flex-shrink-0">{label}</dt>
    <dd className="text-sm font-medium text-foreground flex-1">{value || '—'}</dd>
  </div>
);

const SectionCard = ({ icon: Icon, title, children }) => (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <p className="font-semibold text-sm text-foreground">{title}</p>
      </div>
    </CardHeader>
    <CardBody>
      <dl>{children}</dl>
    </CardBody>
  </Card>
);

const PatientProfile = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { list: patients, loading } = useSelector((s) => s.patients);

  useEffect(() => {
    dispatch(fetchPatients());
  }, [dispatch]);

  // Match logged-in patient to their record.
  // Login username is created as: firstName.toLowerCase() + lastName.toLowerCase()
  const myRecord = patients.find((p) => {
    const expected = `${p.firstName?.toLowerCase()}${p.lastName?.toLowerCase()}`;
    return expected === user?.username?.toLowerCase();
  });

  const calcAge = (dob) => {
    if (!dob) return null;
    return differenceInYears(new Date(), new Date(dob));
  };

  const age = myRecord ? calcAge(myRecord.dateOfBirth) : null;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Your Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your personal health record on file</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : !myRecord ? (
        <Card>
          <CardBody>
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                <User className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="font-semibold text-foreground">Profile not found</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Your profile has not been linked to this account yet. Please contact your administrator.
              </p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Profile Hero */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 p-6 text-white shadow-lg">
            <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10" />
            <div className="absolute bottom-0 right-16 h-16 w-16 rounded-full bg-white/5" />
            <div className="relative z-10 flex items-center gap-5">
              <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                {myRecord.firstName?.[0]}{myRecord.lastName?.[0]}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{myRecord.firstName} {myRecord.lastName}</h2>
                <div className="flex flex-wrap gap-4 mt-1.5 text-blue-100 text-sm">
                  <span>MRN: <span className="font-mono text-white">{String(myRecord.id).padStart(8, '0')}</span></span>
                  {age !== null && <span>Age: <span className="text-white font-semibold">{age} yrs</span></span>}
                  <span>Gender: <span className="text-white font-semibold">{myRecord.gender || '—'}</span></span>
                  {myRecord.bloodType && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-white/20 text-white border border-white/30">
                      {myRecord.bloodType}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <SectionCard icon={Phone} title="Contact Information">
              <InfoRow label="Phone" value={myRecord.contactInformation?.phone} />
              <InfoRow label="Email" value={myRecord.contactInformation?.email} />
              <InfoRow label="Address" value={myRecord.contactInformation?.address} />
            </SectionCard>

            <SectionCard icon={Heart} title="Clinical Details">
              <InfoRow
                label="Date of Birth"
                value={myRecord.dateOfBirth ? format(new Date(myRecord.dateOfBirth), 'MMMM dd, yyyy') : null}
              />
              <InfoRow
                label="Blood Type"
                value={myRecord.bloodType ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-white border border-slate-200 text-blue-600 shadow-sm">
                    {myRecord.bloodType}
                  </span>
                ) : null}
              />
              <InfoRow label="Emergency Contact" value={myRecord.emergencyContact} />
            </SectionCard>

            <SectionCard icon={ShieldCheck} title="Insurance Information">
              <InfoRow label="Provider" value={myRecord.insuranceDetails?.provider} />
              <InfoRow label="Policy Number" value={myRecord.insuranceDetails?.policyNumber} />
              <InfoRow label="Group Number" value={myRecord.insuranceDetails?.groupNumber} />
            </SectionCard>

          </div>
        </>
      )}
    </div>
  );
};

export default PatientProfile;
