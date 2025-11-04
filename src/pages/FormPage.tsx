import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Input,
  VStack,
  useToast,
  Select,
  Card,
  CardBody,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Text,
  Progress,
  List,
  ListItem,
} from '@chakra-ui/react';
import { collection, addDoc, serverTimestamp, writeBatch, doc, Timestamp, getDocs, query } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

interface FormData {
  firstName: string;
  lastName: string;
  callInDate: string;
  createdDate: string;
  category: string;
  leadSource: string;
  referralSource: string;
  referralOut: string;
  referralType: string;
  insuranceCompany: string;
  insuranceType: string;
  privatePay: boolean;
  payorType: string;
  admittedToReferrant: string;
  admitted: string;
  assignedTo: string;
  levelOfCare: string;
  referralSentTo: string;
  outreachRep?: string;
}

export const FormPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<{ success: number; failed: number; errors: string[] }>({ success: 0, failed: 0, errors: [] });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [uniqueOutreachReps, setUniqueOutreachReps] = useState<string[]>([]);
  const [uniqueReferralTypes, setUniqueReferralTypes] = useState<string[]>([]);
  const [uniqueReferralSources, setUniqueReferralSources] = useState<string[]>([]);
  const [referralSourceSuggestions, setReferralSourceSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [uniqueReferralOuts, setUniqueReferralOuts] = useState<string[]>([]);
  const [referralOutSuggestions, setReferralOutSuggestions] = useState<string[]>([]);
  const [showReferralOutSuggestions, setShowReferralOutSuggestions] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    callInDate: '',
    createdDate: '',
    category: '',
    leadSource: '',
    referralSource: '',
    referralOut: '',
    referralType: '',
    insuranceCompany: '',
    insuranceType: '',
    privatePay: false,
    payorType: '',
    admittedToReferrant: '',
    admitted: '',
    assignedTo: '',
    levelOfCare: '',
    referralSentTo: '',
    outreachRep: '',
  });

  const cardBg = useColorModeValue('white', 'gray.700');

  // Fixed list of lead sources for the dropdown
  const LEAD_SOURCE_OPTIONS = [
    'Alumni',
    'Alumni-Readmit',
    'Direct-Internet',
    'Direct-Call Center',
    'Insurance',
    'Employee',
    'Katy Alexander',
    'Tayler Marsh',
    'Joey Price',
    'Jessica Estebane',
    'SBR'
  ];

  // Valid lead sources - used for validation and normalization
  const VALID_LEAD_SOURCES = LEAD_SOURCE_OPTIONS;

  // Normalize lead source - fix incorrect values
  const normalizeLeadSource = (leadSource: string | undefined): string => {
    if (!leadSource) return '';
    
    // Fix "Jessica Estabane" to "Jessica Estebane"
    let normalized = leadSource.replace(/Jessica Estabane/gi, 'Jessica Estebane');
    
    return normalized;
  };

  // Normalize outreach rep name to fix spelling
  const normalizeOutreachRep = (name: string | undefined): string => {
    if (!name) return '';
    // Fix "Jessica Estabane" to "Jessica Estebane"
    return name.replace(/Jessica Estabane/gi, 'Jessica Estebane');
  };

  // Normalize referral type - fix "Treament center" to "Treatment Center"
  const normalizeReferralType = (referralType: string | undefined): string => {
    if (!referralType) return '';
    
    // Fix "Treament center" (misspelled) to "Treatment Center" (correct spelling)
    let normalized = referralType.trim();
    // Fix the misspelling "Treament" to "Treatment" - catch all variations with flexible spacing
    // Matches "Treament Center", "Treament center", "TreamentCenter", etc.
    normalized = normalized.replace(/Treament\s*[Cc]enter/gi, 'Treatment Center');
    // Also normalize other case variations to "Treatment Center" for consistency
    normalized = normalized.replace(/treatment\s+center/gi, 'Treatment Center');
    normalized = normalized.replace(/Treatment\s+center/gi, 'Treatment Center');
    
    return normalized;
  };

  // Normalize referral sent to - fix "COV" and variations to "Cov Hills"
  const normalizeReferralSentTo = (referralSentTo: string | undefined): string => {
    if (!referralSentTo) return '';
    
    let normalized = referralSentTo.trim();
    // Normalize "COV" and variations to "Cov Hills"
    // Matches "COV", "Cov", "cov", "Cov hills", "cov hills", etc.
    if (/^cov\s*hills?$/i.test(normalized) || normalized.toUpperCase() === 'COV') {
      return 'Cov Hills';
    }
    
    return normalized;
  };


  useEffect(() => {
    const fetchOutreachReps = async () => {
      try {
        const q = query(collection(db, 'referrals'));
        const querySnapshot = await getDocs(q);
        const outreachReps = Array.from(
          new Set(
            querySnapshot.docs
              .map(doc => {
                const rep = doc.data().outreachRep;
                return rep ? normalizeOutreachRep(rep) : null;
              })
              .filter(Boolean)
              .filter(rep => rep !== 'Jessica Estabane') // Remove incorrect spelling
          )
        ).sort() as string[];
        setUniqueOutreachReps(outreachReps);
        
        // Also fetch and normalize referral types (matching MetricsPage logic)
        const referralTypes = Array.from(
          new Set(
            querySnapshot.docs
              .map(doc => {
                const type = doc.data().referralType;
                return type ? normalizeReferralType(type) : null;
              })
              .filter(Boolean)
              .filter(type => {
                // Remove any variations of the misspelled "Treament center" (should already be normalized, but double-check)
                const lowerType = type.toLowerCase().trim();
                return lowerType !== 'treament center' && !lowerType.includes('treament');
              })
          )
        ).sort() as string[];
        setUniqueReferralTypes(referralTypes);

        // Fetch unique referral sources (clean "Accounts::::" prefix)
        const referralSources = Array.from(
          new Set(
            querySnapshot.docs
              .map(doc => {
                const source = doc.data().referralSource;
                if (!source) return null;
                // Clean "Accounts::::" prefix if present
                return cleanFieldValue(source);
              })
              .filter(Boolean)
              .filter(source => source && source.trim() !== '')
          )
        ).sort() as string[];
        setUniqueReferralSources(referralSources);

        // Fetch unique referral outs (clean "Accounts::::" prefix)
        const referralOuts = Array.from(
          new Set(
            querySnapshot.docs
              .map(doc => {
                const out = doc.data().referralOut;
                if (!out) return null;
                // Clean "Accounts::::" prefix if present
                return cleanFieldValue(out);
              })
              .filter(Boolean)
              .filter(out => out && out.trim() !== '')
          )
        ).sort() as string[];
        setUniqueReferralOuts(referralOuts);
      } catch (error) {
        console.error('Error fetching outreach reps:', error);
      }
    };
    fetchOutreachReps();
  }, []);

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // If referralOut is being changed and becomes empty, clear admittedToReferrant
      if (field === 'referralOut' && !value) {
        updated.admittedToReferrant = '';
      }
      
      // Handle referral source autocomplete suggestions
      if (field === 'referralSource' && typeof value === 'string') {
        const inputValue = value.toLowerCase().trim();
        if (inputValue.length >= 2 && uniqueReferralSources.length > 0) {
          const filtered = uniqueReferralSources.filter(source =>
            source.toLowerCase().includes(inputValue)
          ).slice(0, 10); // Limit to 10 suggestions
          setReferralSourceSuggestions(filtered);
          setShowSuggestions(filtered.length > 0);
        } else {
          setReferralSourceSuggestions([]);
          setShowSuggestions(false);
        }
      }

      // Handle referral out autocomplete suggestions
      if (field === 'referralOut' && typeof value === 'string') {
        const inputValue = value.toLowerCase().trim();
        if (inputValue.length >= 2 && uniqueReferralOuts.length > 0) {
          const filtered = uniqueReferralOuts.filter(out =>
            out.toLowerCase().includes(inputValue)
          ).slice(0, 10); // Limit to 10 suggestions
          setReferralOutSuggestions(filtered);
          setShowReferralOutSuggestions(filtered.length > 0);
        } else {
          setReferralOutSuggestions([]);
          setShowReferralOutSuggestions(false);
        }
      }
      
      return updated;
    });
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleChange('referralSource', suggestion);
    setShowSuggestions(false);
    setReferralSourceSuggestions([]);
  };

  const handleReferralOutSuggestionClick = (suggestion: string) => {
    handleChange('referralOut', suggestion);
    setShowReferralOutSuggestions(false);
    setReferralOutSuggestions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName || !formData.lastName || !formData.leadSource) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (formData.leadSource === 'Outreach' && !formData.outreachRep) {
      toast({
        title: 'Error',
        description: 'Outreach Rep is required when Lead Source is Outreach',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsLoading(true);

      // Normalize lead source, outreach rep, and referral type before saving
      const normalizedFormData = {
        ...formData,
        leadSource: formData.leadSource ? normalizeLeadSource(formData.leadSource) : formData.leadSource,
        outreachRep: formData.outreachRep ? normalizeOutreachRep(formData.outreachRep) : formData.outreachRep,
        referralType: formData.referralType ? normalizeReferralType(formData.referralType) : formData.referralType,
        referralSentTo: formData.referralSentTo ? normalizeReferralSentTo(formData.referralSentTo) : formData.referralSentTo,
        // Map payorType to privatePay: Private Pay = true, Insurance = false
        privatePay: formData.payorType === 'Private Pay',
      };

      await addDoc(collection(db, 'referrals'), {
        ...normalizedFormData,
        createdAt: serverTimestamp(),
        createdBy: user?.email || 'unknown',
      });

      toast({
        title: 'Success',
        description: 'Referral record created successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        callInDate: '',
        createdDate: '',
        category: '',
        leadSource: '',
        referralSource: '',
        referralOut: '',
        referralType: '',
        insuranceCompany: '',
        insuranceType: '',
        privatePay: false,
        payorType: '',
        admittedToReferrant: '',
        admitted: '',
        assignedTo: '',
        levelOfCare: '',
        referralSentTo: '',
        outreachRep: '',
      });
    } catch (error) {
      console.error('Error creating record:', error);
      toast({
        title: 'Error',
        description: 'Failed to create record',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Parse CSV handling quoted values
    const parseCSVLine = (line: string): string[] => {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      return values;
    };

    const headers = parseCSVLine(lines[0]);
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }

    return rows;
  };

  const cleanFieldValue = (value: string): string => {
    if (!value) return value;
    // Strip "Accounts::::" prefix if present
    return value.replace(/^Accounts::::/, '').trim();
  };

  const mapCSVRowToFormData = (row: any): any => {
    // Map various column name formats to our form field names
    const mapped: any = {};

    // First Name mapping
    mapped.firstName = row.firstName || row['First Name'] || row['first name'] || '';

    // Last Name mapping
    mapped.lastName = row.lastName || row['Last Name'] || row['last name'] || '';

    // Call in Date mapping
    mapped.callInDate = row.callInDate || row['Call in Date'] || row['call in date'] || '';

    // Created Date mapping (from Created Time in exports)
    mapped.createdDate = row.createdDate || row['Created Date'] || row['Created Time'] || row['created time'] || '';

    // Category mapping
    mapped.category = row.category || row['Category'] || row['category'] || '';

    // Lead Source mapping - preserve exact value from CSV
    let leadSourceValue = row.leadSource || row['Lead Source'] || row['lead source'] || '';
    // Normalize only the misspelled "Jessica Estabane" to "Jessica Estebane"
    if (leadSourceValue) {
      leadSourceValue = normalizeLeadSource(leadSourceValue);
    }
    mapped.leadSource = leadSourceValue;

    // Referral Source mapping (clean "Accounts::::" prefix)
    mapped.referralSource = cleanFieldValue(row.referralSource || row['Referral Source'] || row['referral source'] || '');

    // Referral Out mapping (clean "Accounts::::" prefix)
    mapped.referralOut = cleanFieldValue(row.referralOut || row['Referral Out'] || row['referral out'] || '');

    // Referral Type mapping
    mapped.referralType = row.referralType || row['Referral Type'] || row['referral type'] || '';

    // Insurance Company mapping
    mapped.insuranceCompany = row.insuranceCompany || row['Insurance Company'] || row['insurance company'] || '';

    // Insurance Type mapping
    mapped.insuranceType = row.insuranceType || row['Insurance Type'] || row['insurance type'] || '';

    // Payor Type mapping - convert to privatePay boolean
    // Support both "Payor Type" column and legacy "Private Pay" column
    const payorType = row.payorType || row['Payor Type'] || row['payor type'] || '';
    const privatePayValue = row.privatePay || row['Private Pay'] || row['private pay'] || '';
    
    // If Payor Type is specified, use it; otherwise fall back to Private Pay field
    if (payorType) {
      mapped.payorType = payorType;
      mapped.privatePay = payorType === 'Private Pay';
    } else {
      // Legacy support: convert Private Pay field to Payor Type
      const isPrivatePay = privatePayValue?.toLowerCase() === 'true' || privatePayValue === '1' || privatePayValue?.toLowerCase() === 'yes';
      mapped.payorType = isPrivatePay ? 'Private Pay' : 'Insurance';
      mapped.privatePay = isPrivatePay;
    }

    // Admitted to Referrant mapping (only if Referral Out is populated)
    const referralOutValue = cleanFieldValue(row.referralOut || row['Referral Out'] || row['referral out'] || '');
    if (referralOutValue) {
      mapped.admittedToReferrant = row.admittedToReferrant || row['Admitted to Referrant'] || row['admitted to referrant'] || '';
    } else {
      mapped.admittedToReferrant = '';
    }

    // Admitted mapping
    mapped.admitted = row.admitted || row.Admitted || row['admitted'] || '';

    // Assigned To mapping
    mapped.assignedTo = row.assignedTo || row['Assigned To'] || row['assigned to'] || '';

    // Level of Care mapping (could be Program in old format)
    mapped.levelOfCare = row.levelOfCare || row['Level of Care'] || row['level of care'] || row.program || row.Program || '';

    // Referral Sent To mapping
    const referralSentToRaw = row.referralSentTo || row['Referral Sent To'] || row['referral sent to'] || '';
    mapped.referralSentTo = referralSentToRaw ? normalizeReferralSentTo(referralSentToRaw) : '';

    // Outreach Rep mapping (normalize spelling)
    const outreachRepRaw = row.outreachRep || row['Outreach Rep'] || row['outreach rep'] || '';
    mapped.outreachRep = outreachRepRaw ? normalizeOutreachRep(outreachRepRaw) : '';

    return mapped;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Error',
        description: 'Please upload a CSV file',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsBatchUploading(true);
      setUploadProgress(0);
      setUploadResults({ success: 0, failed: 0, errors: [] });

      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        toast({
          title: 'Error',
          description: 'No valid data found in CSV',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Process in batches of 500 (Firestore limit)
      const batchSize = 500;
      const totalBatches = Math.ceil(rows.length / batchSize);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batch = writeBatch(db);
        const start = batchIndex * batchSize;
        const end = Math.min(start + batchSize, rows.length);

        for (let i = start; i < end; i++) {
          const rawRow = rows[i];
          const row = mapCSVRowToFormData(rawRow);

          // Validate required fields
          if (!row.firstName || !row.lastName) {
            failedCount++;
            errors.push(`Row ${i + 2}: Missing required fields (firstName or lastName)`);
            continue;
          }

          // Set default leadSource if missing
          if (!row.leadSource) {
            row.leadSource = 'Direct';
          }

          // Normalize leadSource - only fixes "Jessica Estabane" to "Jessica Estebane"
          // All other lead source values (including person names) are preserved as-is from CSV
          if (row.leadSource) {
            row.leadSource = normalizeLeadSource(row.leadSource);
          }

          // Normalize outreachRep
          if (row.outreachRep) {
            row.outreachRep = normalizeOutreachRep(row.outreachRep);
          }

          // Normalize referralType
          if (row.referralType) {
            row.referralType = normalizeReferralType(row.referralType);
          }

          // Normalize referralSentTo
          if (row.referralSentTo) {
            row.referralSentTo = normalizeReferralSentTo(row.referralSentTo);
          }

          // Validate outreachRep when leadSource is Outreach
          if (row.leadSource === 'Outreach' && !row.outreachRep) {
            failedCount++;
            errors.push(`Row ${i + 2}: outreachRep is required when leadSource is Outreach`);
            continue;
          }

          // Convert privatePay field or Payor Type
          let privatePay = false;
          const payorTypeValue = row.payorType || row['Payor Type'] || row['payor type'] || '';
          if (payorTypeValue) {
            // If Payor Type is specified, use it
            privatePay = payorTypeValue === 'Private Pay';
          } else {
            // Legacy support: convert Private Pay field
            privatePay = row.privatePay?.toLowerCase() === 'true' || row.privatePay === '1' || row.privatePay?.toLowerCase() === 'yes';
          }

          // Parse createdDate from CSV and convert to Firestore Timestamp
          let createdAtTimestamp;
          if (row.createdDate) {
            try {
              // Handle formats like "01-01-2025 14:16:44" or "2025-01-01"
              let dateStr = row.createdDate;
              // Convert MM-DD-YYYY to YYYY-MM-DD if needed
              if (/^\d{2}-\d{2}-\d{4}/.test(dateStr)) {
                dateStr = dateStr.replace(/(\d{2})-(\d{2})-(\d{4})/, '$3-$1-$2');
              }
              const parsedDate = new Date(dateStr);
              if (!isNaN(parsedDate.getTime())) {
                createdAtTimestamp = Timestamp.fromDate(parsedDate);
              } else {
                createdAtTimestamp = serverTimestamp();
              }
            } catch (e) {
              createdAtTimestamp = serverTimestamp();
            }
          } else {
            createdAtTimestamp = serverTimestamp();
          }

          // Clear admittedToReferrant if referralOut is empty
          const admittedToReferrantValue = row.referralOut ? (row.admittedToReferrant || '') : '';

          const docRef = doc(collection(db, 'referrals'));
          batch.set(docRef, {
            firstName: row.firstName || '',
            lastName: row.lastName || '',
            callInDate: row.callInDate || '',
            createdDate: row.createdDate || '',
            category: row.category || '',
            leadSource: row.leadSource || 'Direct',
            referralSource: row.referralSource || '',
            referralOut: row.referralOut || '',
            referralType: row.referralType || '',
            insuranceCompany: row.insuranceCompany || '',
            insuranceType: row.insuranceType || '',
            privatePay: privatePay,
            admittedToReferrant: admittedToReferrantValue,
            admitted: row.admitted || '',
            assignedTo: row.assignedTo || '',
            levelOfCare: row.levelOfCare || '',
            referralSentTo: row.referralSentTo || '',
            outreachRep: row.outreachRep || '',
            createdAt: createdAtTimestamp,
            createdBy: user?.email || 'unknown',
          });
          successCount++;
        }

        await batch.commit();
        setUploadProgress(Math.round(((batchIndex + 1) / totalBatches) * 100));
      }

      setUploadResults({ success: successCount, failed: failedCount, errors });

      toast({
        title: 'Upload Complete',
        description: `Successfully uploaded ${successCount} records${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
        status: successCount > 0 ? 'success' : 'error',
        duration: 5000,
        isClosable: true,
      });

    } catch (error) {
      console.error('Error uploading CSV:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload CSV file',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsBatchUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleBatchUploadClick = () => {
    onOpen();
  };

  const handleModalClose = () => {
    setUploadResults({ success: 0, failed: 0, errors: [] });
    setUploadProgress(0);
    onClose();
  };

  return (
    <Container maxW="container.md" py={10}>
      <VStack spacing={6}>
        {/* Batch Upload Button - Desktop Only */}
        <Box width="full" display={{ base: 'none', md: 'flex' }} justifyContent="flex-end">
          <Button
            leftIcon={<Box as="span" className="material-icons">upload_file</Box>}
            colorScheme="green"
            onClick={handleBatchUploadClick}
            size="sm"
          >
            Batch Upload CSV
          </Button>
        </Box>

        <Card width="full" bg={cardBg} shadow="lg">
          <CardBody>
            <form onSubmit={handleSubmit}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>First Name</FormLabel>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    placeholder="Enter first name"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Last Name</FormLabel>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    placeholder="Enter last name"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Call in Date</FormLabel>
                  <Input
                    type="date"
                    value={formData.callInDate}
                    onChange={(e) => handleChange('callInDate', e.target.value)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Category</FormLabel>
                  <Select
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    placeholder="Select category"
                  >
                    <option value="Base">Base</option>
                    <option value="Outreach">Outreach</option>
                    <option value="Kaiser">Kaiser</option>
                    <option value="Direct">Direct</option>
                    <option value="Union">Union</option>
                  </Select>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Lead Source</FormLabel>
                  <Select
                    value={formData.leadSource}
                    onChange={(e) => handleChange('leadSource', e.target.value)}
                    placeholder="Select lead source"
                  >
                    {LEAD_SOURCE_OPTIONS.map(source => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Lead Sent To</FormLabel>
                  <Select
                    value={formData.referralSentTo}
                    onChange={(e) => handleChange('referralSentTo', e.target.value)}
                    placeholder="Select destination"
                  >
                    <option value="SBR">SBR</option>
                    <option value="Cov Hills">Cov Hills</option>
                  </Select>
                </FormControl>

                {formData.leadSource === 'Outreach' && (
                  <FormControl isRequired>
                    <FormLabel>Outreach Rep</FormLabel>
                    <Select
                      value={formData.outreachRep || ''}
                      onChange={(e) => handleChange('outreachRep', e.target.value)}
                      placeholder="Select outreach rep"
                    >
                      {uniqueOutreachReps.length > 0 ? (
                        uniqueOutreachReps.map(rep => (
                          <option key={rep} value={rep}>{rep}</option>
                        ))
                      ) : (
                        <option value="">No outreach reps available</option>
                      )}
                    </Select>
                  </FormControl>
                )}

                <FormControl>
                  <FormLabel>Referral Source</FormLabel>
                  <Box position="relative">
                    <Input
                      value={formData.referralSource}
                      onChange={(e) => handleChange('referralSource', e.target.value)}
                      onFocus={(e) => {
                        const inputValue = e.target.value.toLowerCase().trim();
                        if (inputValue.length >= 2 && uniqueReferralSources.length > 0) {
                          const filtered = uniqueReferralSources.filter(source =>
                            source.toLowerCase().includes(inputValue)
                          ).slice(0, 10);
                          setReferralSourceSuggestions(filtered);
                          setShowSuggestions(filtered.length > 0);
                        }
                      }}
                      onBlur={() => {
                        // Delay hiding suggestions to allow click events
                        setTimeout(() => setShowSuggestions(false), 200);
                      }}
                      placeholder="Enter Referral Source"
                    />
                    {showSuggestions && referralSourceSuggestions.length > 0 && (
                      <Box
                        position="absolute"
                        zIndex={1000}
                        width="100%"
                        mt={1}
                        bg={cardBg}
                        border="1px solid"
                        borderColor="gray.200"
                        borderRadius="md"
                        boxShadow="lg"
                        maxH="200px"
                        overflowY="auto"
                      >
                        {referralSourceSuggestions.map((suggestion, index) => (
                          <Box
                            key={index}
                            px={4}
                            py={2}
                            cursor="pointer"
                            _hover={{ bg: 'gray.100' }}
                            onClick={() => handleSuggestionClick(suggestion)}
                            onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
                          >
                            <Text fontSize="sm">{suggestion}</Text>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                </FormControl>

                <FormControl>
                  <FormLabel>Referral Type</FormLabel>
                  <Select
                    value={formData.referralType}
                    onChange={(e) => handleChange('referralType', e.target.value)}
                    placeholder="Select Referral Type"
                  >
                    {uniqueReferralTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Payor Type</FormLabel>
                  <Select
                    value={formData.payorType}
                    onChange={(e) => {
                      handleChange('payorType', e.target.value);
                      // Clear insurance company if switching to Private Pay
                      if (e.target.value === 'Private Pay') {
                        handleChange('insuranceCompany', '');
                      }
                    }}
                    placeholder="Select payor type"
                  >
                    <option value="Insurance">Insurance</option>
                    <option value="Private Pay">Private Pay</option>
                  </Select>
                </FormControl>

                {formData.payorType === 'Insurance' && (
                  <FormControl>
                    <FormLabel>Insurance Company</FormLabel>
                    <Input
                      value={formData.insuranceCompany}
                      onChange={(e) => handleChange('insuranceCompany', e.target.value)}
                      placeholder="Enter insurance company"
                    />
                  </FormControl>
                )}

                <FormControl>
                  <FormLabel>Insurance Type</FormLabel>
                  <Select
                    value={formData.insuranceType}
                    onChange={(e) => handleChange('insuranceType', e.target.value)}
                    placeholder="Select insurance type"
                  >
                    <option value="HMO">HMO</option>
                    <option value="PPO">PPO</option>
                    <option value="EPO">EPO</option>
                    <option value="Union">Union</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Level of Care</FormLabel>
                  <Select
                    value={formData.levelOfCare}
                    onChange={(e) => handleChange('levelOfCare', e.target.value)}
                    placeholder="Select level of care"
                  >
                    <option value="DTX">DTX</option>
                    <option value="RTC">RTC</option>
                    <option value="PHP">PHP</option>
                    <option value="IOP">IOP</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Admitted to SBR/COV</FormLabel>
                  <Select
                    value={formData.admitted}
                    onChange={(e) => handleChange('admitted', e.target.value)}
                    placeholder="Select status"
                  >
                    <option value="YES">Yes</option>
                    <option value="NO">No</option>
                    <option value="Pending">Pending</option>
                    <option value="In process">In process</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Admissions Rep</FormLabel>
                  <Input
                    value={formData.assignedTo}
                    onChange={(e) => handleChange('assignedTo', e.target.value)}
                    placeholder="Enter admissions rep"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Referral Out</FormLabel>
                  <Box position="relative">
                    <Input
                      value={formData.referralOut}
                      onChange={(e) => handleChange('referralOut', e.target.value)}
                      onFocus={(e) => {
                        const inputValue = e.target.value.toLowerCase().trim();
                        if (inputValue.length >= 2 && uniqueReferralOuts.length > 0) {
                          const filtered = uniqueReferralOuts.filter(out =>
                            out.toLowerCase().includes(inputValue)
                          ).slice(0, 10);
                          setReferralOutSuggestions(filtered);
                          setShowReferralOutSuggestions(filtered.length > 0);
                        }
                      }}
                      onBlur={() => {
                        // Delay hiding suggestions to allow click events
                        setTimeout(() => setShowReferralOutSuggestions(false), 200);
                      }}
                      placeholder="Enter referral out"
                    />
                    {showReferralOutSuggestions && referralOutSuggestions.length > 0 && (
                      <Box
                        position="absolute"
                        zIndex={1000}
                        width="100%"
                        mt={1}
                        bg={cardBg}
                        border="1px solid"
                        borderColor="gray.200"
                        borderRadius="md"
                        boxShadow="lg"
                        maxH="200px"
                        overflowY="auto"
                      >
                        {referralOutSuggestions.map((suggestion, index) => (
                          <Box
                            key={index}
                            px={4}
                            py={2}
                            cursor="pointer"
                            _hover={{ bg: 'gray.100' }}
                            onClick={() => handleReferralOutSuggestionClick(suggestion)}
                            onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
                          >
                            <Text fontSize="sm">{suggestion}</Text>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                </FormControl>

                {formData.referralOut && (
                  <FormControl>
                    <FormLabel>Admitted to Referrant</FormLabel>
                    <Select
                      value={formData.admittedToReferrant}
                      onChange={(e) => handleChange('admittedToReferrant', e.target.value)}
                      placeholder="Select status"
                    >
                      <option value="YES">Yes</option>
                      <option value="NO">No</option>
                      <option value="Returned to Referent">Returned to Referent</option>
                      <option value="Pending">Pending</option>
                    </Select>
                  </FormControl>
                )}

                <Button
                  type="submit"
                  colorScheme="blue"
                  size="lg"
                  width="full"
                  isLoading={isLoading}
                  leftIcon={<Box as="span" className="material-icons">save</Box>}
                >
                  Submit Referral
                </Button>
              </VStack>
            </form>
          </CardBody>
        </Card>
      </VStack>

      {/* Batch Upload Modal */}
      <Modal isOpen={isOpen} onClose={handleModalClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Batch Upload CSV</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text fontSize="sm" color="gray.600">
                Upload a CSV file with columns: First Name, Last Name, Call in Date, Created Date, Category, Lead Source, Referral Source, Referral Out, Referral Type, Payor Type (or Private Pay), Insurance Company, Insurance Type, Admitted to Referrant, Admitted, Assigned To, Level of Care, Lead Sent To
              </Text>

              <Text fontSize="sm" fontWeight="bold">
                Required fields: firstName/First Name, lastName/Last Name
              </Text>

              <Text fontSize="sm" color="gray.500">
                Missing fields will use default values. If leadSource is missing, it will default to "Direct".
              </Text>

              <Text fontSize="sm" fontWeight="bold" color="orange.500">
                Note: outreachRep is required when leadSource is "Outreach"
              </Text>

              <FormControl>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={isBatchUploading}
                />
              </FormControl>

              {isBatchUploading && (
                <Box>
                  <Text fontSize="sm" mb={2}>Uploading... {uploadProgress}%</Text>
                  <Progress value={uploadProgress} size="sm" colorScheme="blue" />
                </Box>
              )}

              {uploadResults.success > 0 && (
                <Box>
                  <Text fontWeight="bold" color="green.500">
                    ✓ Successfully uploaded: {uploadResults.success} records
                  </Text>
                  {uploadResults.failed > 0 && (
                    <Text fontWeight="bold" color="red.500" mt={2}>
                      ✗ Failed: {uploadResults.failed} records
                    </Text>
                  )}
                </Box>
              )}

              {uploadResults.errors.length > 0 && (
                <Box maxH="200px" overflowY="auto" borderWidth={1} borderRadius="md" p={3}>
                  <Text fontWeight="bold" fontSize="sm" mb={2}>Errors:</Text>
                  <List spacing={1}>
                    {uploadResults.errors.slice(0, 20).map((error, index) => (
                      <ListItem key={index} fontSize="xs" color="red.500">
                        • {error}
                      </ListItem>
                    ))}
                    {uploadResults.errors.length > 20 && (
                      <ListItem fontSize="xs" color="gray.500">
                        ... and {uploadResults.errors.length - 20} more errors
                      </ListItem>
                    )}
                  </List>
                </Box>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={handleModalClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};
