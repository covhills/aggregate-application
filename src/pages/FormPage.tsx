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
import { collection, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

interface FormData {
  firstName: string;
  lastName: string;
  leadSource: string;
  referralSource: string;
  referralOut: string;
  insuranceCompany: string;
  program: string;
  referralSentTo: string;
  admitted: boolean;
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
    leadSource: 'Insurance',
    referralSource: '',
    referralOut: '',
    insuranceCompany: '',
    program: '',
    referralSentTo: '',
    admitted: false,
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
        leadSource: 'Insurance',
        referralSource: '',
        referralOut: '',
        insuranceCompany: '',
        program: '',
        referralSentTo: '',
        admitted: false,
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

    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }

    return rows;
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
          const row = rows[i];

          // Validate required fields
          if (!row.firstName || !row.lastName || !row.leadSource) {
            failedCount++;
            errors.push(`Row ${i + 2}: Missing required fields (firstName, lastName, or leadSource)`);
            continue;
          }

          // Validate outreachRep when leadSource is Outreach
          if (row.leadSource === 'Outreach' && !row.outreachRep) {
            failedCount++;
            errors.push(`Row ${i + 2}: outreachRep is required when leadSource is Outreach`);
            continue;
          }

          // Convert admitted field
          const admitted = row.admitted?.toLowerCase() === 'true' || row.admitted === '1' || row.admitted?.toLowerCase() === 'yes';

          const docRef = doc(collection(db, 'referrals'));
          batch.set(docRef, {
            firstName: row.firstName || '',
            lastName: row.lastName || '',
            leadSource: row.leadSource || '',
            referralSource: row.referralSource || '',
            referralOut: row.referralOut || '',
            insuranceCompany: row.insuranceCompany || '',
            program: row.program || '',
            referralSentTo: row.referralSentTo || '',
            admitted: admitted,
            outreachRep: row.outreachRep || '',
            createdAt: serverTimestamp(),
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
                  <FormLabel>Insurance Company</FormLabel>
                  <Input
                    value={formData.insuranceCompany}
                    onChange={(e) => handleChange('insuranceCompany', e.target.value)}
                    placeholder="Enter insurance company"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Program</FormLabel>
                  <Select
                    value={formData.program}
                    onChange={(e) => handleChange('program', e.target.value)}
                    placeholder="Select program"
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
                  <Checkbox
                    isChecked={formData.admitted}
                    onChange={(e) => handleChange('admitted', e.target.checked)}
                  >
                    Admitted
                  </Checkbox>
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
                Upload a CSV file with the following columns: firstName, lastName, leadSource, outreachRep, referralSource, referralOut, insuranceCompany, program, referralSentTo, admitted
              </Text>

              <Text fontSize="sm" fontWeight="bold">
                Required fields: firstName, lastName, leadSource
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
