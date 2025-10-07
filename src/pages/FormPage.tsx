import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  VStack,
  useToast,
  Select,
  Checkbox,
  Card,
  CardBody,
  useColorModeValue,
} from '@chakra-ui/react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
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
}

export const FormPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
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

  return (
    <Container maxW="container.md" py={10}>
      <VStack spacing={6}>
        <Heading>New Referral</Heading>

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
    </Container>
  );
};
