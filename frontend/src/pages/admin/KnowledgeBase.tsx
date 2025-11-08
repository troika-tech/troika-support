import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  Alert,
  Pagination,
  Checkbox
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import {
  CloudUpload as UploadIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import adminService, { KnowledgeBaseArticle } from '../../services/admin.service';

const KnowledgeBase = () => {
  const [articles, setArticles] = useState<KnowledgeBaseArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [uploadServices, setUploadServices] = useState<string[]>(['whatsapp', 'ai_agent']);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  const allowedExtensions = ['.pdf', '.docx', '.txt'];
  const allowedMimeTypes = [
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  const fetchArticles = async (targetPage = page, query = search) => {
    const previousPage = page;
    setPage(targetPage);
    try {
      setLoading(true);
      const response = await adminService.getKnowledgeBaseArticles({
        search: query || undefined,
        page: targetPage,
        limit: 20,
      });

      setArticles(response.articles);
      setTotalPages(response.pagination.totalPages);

      setListError(null);
    } catch (err: any) {
      setPage(previousPage);
      setListError(err.response?.data?.message || 'Failed to load knowledge base articles');
      console.error('Error fetching articles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    fetchArticles(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    fetchArticles(value);
  };

  const resetUploadMessages = () => {
    setUploadError(null);
    setUploadSuccess(null);
  };

  const handleBrowseClick = () => {
    resetUploadMessages();
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (file: File) => {
    resetUploadMessages();

    const extension = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')).toLowerCase() : '';
    const isAllowedExtension = allowedExtensions.includes(extension);
    const isAllowedMime = allowedMimeTypes.includes(file.type);

    if (!isAllowedExtension && !isAllowedMime) {
      setUploadError('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File is too large. Maximum upload size is 100MB.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setSelectedFileName(file.name);
    setUploading(true);

    // Validate services
    if (uploadServices.length === 0) {
      setUploadError('Please select at least one service (WhatsApp Marketing or AI Agent).');
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('services', JSON.stringify(uploadServices));

      const response = await adminService.uploadKnowledgeBaseFile(formData);
      setUploadSuccess(
        `Uploaded ${response.knowledgeBase.title} (${response.chunksCreated} chunk${
          response.chunksCreated === 1 ? '' : 's'
        }) successfully.`
      );

      setUploadServices(['whatsapp', 'ai_agent']);
      setSelectedFileName('');
      await fetchArticles(1);
    } catch (err: any) {
      setUploadError(err.response?.data?.message || 'Failed to upload knowledge base file');
      console.error('Upload knowledge base file error:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    handleFileUpload(file);
  };

  return (
    <Stack spacing={4} sx={{ py: 4 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Knowledge Base
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Upload customer-ready knowledge assets and make them instantly searchable for your teams.
          </Typography>
        </Box>
      </Box>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Upload Knowledge Asset
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Accepts PDF, DOCX, or TXT files up to 100MB. Embeddings are generated automatically after upload.
              </Typography>
            </Box>

            <Box>
              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                disabled={uploading}
                onClick={handleBrowseClick}
              >
                {uploading ? 'Uploading…' : 'Select File'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                hidden
                onChange={handleFileInputChange}
              />
            </Box>
          </Stack>

          {selectedFileName && !uploading && (
            <Typography variant="body2" color="text.secondary">
              Selected file: {selectedFileName}
            </Typography>
          )}

          <FormControl fullWidth>
            <InputLabel id="knowledge-services-label">Services *</InputLabel>
            <Select
              labelId="knowledge-services-label"
              label="Services *"
              multiple
              value={uploadServices}
              onChange={(event: SelectChangeEvent<string[]>) => {
                const value = event.target.value;
                setUploadServices(typeof value === 'string' ? value.split(',') : value);
              }}
              disabled={uploading}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip
                      key={value}
                      label={value === 'whatsapp' ? 'WhatsApp Marketing' : 'AI Agent'}
                      size="small"
                    />
                  ))}
                </Box>
              )}
            >
              <MenuItem value="whatsapp">
                <Checkbox checked={uploadServices.indexOf('whatsapp') > -1} />
                <ListItemText primary="WhatsApp Marketing" />
              </MenuItem>
              <MenuItem value="ai_agent">
                <Checkbox checked={uploadServices.indexOf('ai_agent') > -1} />
                <ListItemText primary="AI Agent" />
              </MenuItem>
            </Select>
          </FormControl>

          {uploadError && (
            <Alert severity="error" onClose={() => setUploadError(null)}>
              {uploadError}
            </Alert>
          )}

          {uploadSuccess && (
            <Alert severity="success" onClose={() => setUploadSuccess(null)}>
              {uploadSuccess}
            </Alert>
          )}

          {uploading && <LinearProgress />}
        </Stack>
      </Paper>

      {listError && (
        <Alert severity="error" onClose={() => setListError(null)}>
          {listError}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
        <TextField
          fullWidth
          placeholder="Search by title or keyword"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyPress={handleKeyPress}
          InputProps={{
            startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
          }}
        />
        <Button variant="contained" onClick={handleSearch}>
          Search
        </Button>
      </Stack>

      <Divider />

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : articles.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Typography variant="body1" color="text.secondary">
            No knowledge base articles found.
          </Typography>
        </Box>
      ) : (
        <>
          <List sx={{ width: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            {articles.map((article) => (
              <ListItem
                key={article.id}
                divider
                secondaryAction={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      label={article.status}
                      size="small"
                      color={
                        article.status === 'ready'
                          ? 'success'
                          : article.status === 'processing'
                          ? 'warning'
                          : 'error'
                      }
                    />
                  </Stack>
                }
                sx={{ alignItems: 'flex-start', py: 2.5, px: 3 }}
              >
                <ListItemText
                  primary={
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
                      {article.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary">
                        {article.summary}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {article.updatedAt} • {article.uploaderName}
                        {article.companyName && ` • ${article.companyName}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {`Chunks: ${article.totalChunks}`}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>

          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination count={totalPages} page={page} onChange={handlePageChange} color="primary" />
            </Box>
          )}
        </>
      )}
    </Stack>
  );
};

export default KnowledgeBase;

