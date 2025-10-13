import React, { useState, useRef } from 'react';
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
  Checkbox,
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
import { collection, addDoc, serverTimestamp, writeBatch, doc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

interface FormData {
  firstName: string;
  lastName: string;
  callInDate: string;
  createdDate: string;
  leadSource: string;
  referralSource: string;
  referralOut: string;
  referralType: string;
  insuranceCompany: string;
  privatePay: boolean;
  levelOfCare: string;
  referralSentTo: string;
  admitted: string;
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

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    callInDate: '',
    createdDate: '',
    leadSource: 'Insurance',
    referralSource: '',
    referralOut: '',
    referralType: '',
    insuranceCompany: '',
    privatePay: false,
    levelOfCare: '',
    referralSentTo: '',
    admitted: '',
    outreachRep: '',
  });

  const cardBg = useColorModeValue('white', 'gray.700');

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

      await addDoc(collection(db, 'referrals'), {
        ...formData,
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
        leadSource: 'Insurance',
        referralSource: '',
        referralOut: '',
        referralType: '',
        insuranceCompany: '',
        privatePay: false,
        levelOfCare: '',
        referralSentTo: '',
        admitted: '',
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

    // Lead Source mapping
    mapped.leadSource = row.leadSource || row['Lead Source'] || row['lead source'] || '';

    // Referral Source mapping (clean "Accounts::::" prefix)
    mapped.referralSource = cleanFieldValue(row.referralSource || row['Referral Source'] || row['referral source'] || '');

    // Referral Out mapping (clean "Accounts::::" prefix)
    mapped.referralOut = cleanFieldValue(row.referralOut || row['Referral Out'] || row['referral out'] || '');

    // Referral Type mapping
    mapped.referralType = row.referralType || row['Referral Type'] || row['referral type'] || '';

    // Insurance Company mapping
    mapped.insuranceCompany = row.insuranceCompany || row['Insurance Company'] || row['insurance company'] || '';

    // Private Pay mapping
    mapped.privatePay = row.privatePay || row['Private Pay'] || row['private pay'] || '';

    // Level of Care mapping (could be Program in old format)
    mapped.levelOfCare = row.levelOfCare || row['Level of Care'] || row['level of care'] || row.program || row.Program || '';

    // Referral Sent To mapping
    mapped.referralSentTo = row.referralSentTo || row['Referral Sent To'] || row['referral sent to'] || '';

    // Admitted mapping
    mapped.admitted = row.admitted || row.Admitted || '';

    // Outreach Rep mapping
    mapped.outreachRep = row.outreachRep || row['Outreach Rep'] || row['outreach rep'] || '';

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

          // Validate outreachRep when leadSource is Outreach
          if (row.leadSource === 'Outreach' && !row.outreachRep) {
            failedCount++;
            errors.push(`Row ${i + 2}: outreachRep is required when leadSource is Outreach`);
            continue;
          }

          // Convert privatePay field
          const privatePay = row.privatePay?.toLowerCase() === 'true' || row.privatePay === '1' || row.privatePay?.toLowerCase() === 'yes';

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

          const docRef = doc(collection(db, 'referrals'));
          batch.set(docRef, {
            firstName: row.firstName || '',
            lastName: row.lastName || '',
            callInDate: row.callInDate || '',
            createdDate: row.createdDate || '',
            leadSource: row.leadSource || 'Direct',
            referralSource: row.referralSource || '',
            referralOut: row.referralOut || '',
            referralType: row.referralType || '',
            insuranceCompany: row.insuranceCompany || '',
            privatePay: privatePay,
            levelOfCare: row.levelOfCare || '',
            referralSentTo: row.referralSentTo || '',
            admitted: row.admitted || '',
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

                <FormControl isRequired>
                  <FormLabel>Lead Source</FormLabel>
                  <Select
                    value={formData.leadSource}
                    onChange={(e) => handleChange('leadSource', e.target.value)}
                  >
                    <option value="Insurance">Insurance</option>
                    <option value="Kaiser">Kaiser</option>
                    <option value="Outreach">Outreach</option>
                    <option value="Direct">Direct</option>
                  </Select>
                </FormControl>

                {formData.leadSource === 'Outreach' && (
                  <FormControl isRequired>
                    <FormLabel>Outreach Rep</FormLabel>
                    <Input
                      value={formData.outreachRep || ''}
                      onChange={(e) => handleChange('outreachRep', e.target.value)}
                      placeholder="Enter outreach rep name"
                    />
                  </FormControl>
                )}

                <FormControl>
                  <FormLabel>Referral Source</FormLabel>
                  <Input
                    value={formData.referralSource}
                    onChange={(e) => handleChange('referralSource', e.target.value)}
                    placeholder="Enter referral source"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Referral Out</FormLabel>
                  <Input
                    value={formData.referralOut}
                    onChange={(e) => handleChange('referralOut', e.target.value)}
                    placeholder="Enter referral out"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Referral Type</FormLabel>
                  <Select
                    value={formData.referralType}
                    onChange={(e) => handleChange('referralType', e.target.value)}
                    placeholder="Select referral type"
                  >
                    <option value="Treatment center">Treatment center</option>
                    <option value="Internet">Internet</option>
                    <option value="Therapist">Therapist</option>
                    <option value="Interventionist">Interventionist</option>
                    <option value="Kaiser">Kaiser</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Alumni">Alumni</option>
                    <option value="Re-admit">Re-admit</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Insurance Company</FormLabel>
                  <Input
                    value={formData.insuranceCompany}
                    onChange={(e) => handleChange('insuranceCompany', e.target.value)}
                    placeholder="Enter insurance company"
                  />
                </FormControl>

                <FormControl>
                  <Checkbox
                    isChecked={formData.privatePay}
                    onChange={(e) => handleChange('privatePay', e.target.checked)}
                  >
                    Private Pay
                  </Checkbox>
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
                  <FormLabel>Referral Sent To</FormLabel>
                  <Select
                    value={formData.referralSentTo}
                    onChange={(e) => handleChange('referralSentTo', e.target.value)}
                    placeholder="Select destination"
                  >
                    <option value="SBR">SBR</option>
                    <option value="Cov hills">Cov hills</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Admitted</FormLabel>
                  <Select
                    value={formData.admitted}
                    onChange={(e) => handleChange('admitted', e.target.value)}
                    placeholder="Select status"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                    <option value="Pending">Pending</option>
                    <option value="In process">In process</option>
                  </Select>
                </FormControl>

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
                Upload a CSV file with columns like: firstName (or "First Name"), lastName (or "Last Name"), callInDate, createdDate (or "Created Time"), leadSource (or "Lead Source"), referralSource (or "Referral Source"), referralOut (or "Referral Out"), referralType, insuranceCompany (or "Insurance Company"), privatePay, levelOfCare, referralSentTo, admitted, outreachRep
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
