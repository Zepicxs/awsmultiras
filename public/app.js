// Navigation
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  document.getElementById(sectionId).classList.add('active');
  document.querySelector(`[href="#${sectionId}"]`).classList.add('active');
}

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const sectionId = e.target.getAttribute('href').substring(1);
    showSection(sectionId);
  });
});

// Dark mode toggle
document.getElementById('darkModeToggle').addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  const btn = document.getElementById('darkModeToggle');
  btn.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
});

// Load initial data
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadRecent();
  loadCategories();
});

// Stats
async function loadStats() {
  try {
    const response = await fetch('/stats');
    const stats = await response.json();
    document.getElementById('totalArchives').textContent = stats.totalArchives;
    document.getElementById('totalStorage').textContent = `${(stats.totalSize / (1024 * 1024)).toFixed(2)} MB`;
    document.getElementById('totalCategories').textContent = stats.categories;
  } catch (error) {
    console.error('Load stats error:', error);
  }
}

// Recent uploads
async function loadRecent() {
  try {
    const response = await fetch('/recent');
    const recent = await response.json();
    const recentList = document.getElementById('recentList');
    recentList.innerHTML = recent.map(archive => `
      <div class="recent-item">
        <strong>${archive.filename}</strong> - ${new Date(archive.uploadDate).toLocaleDateString()}
      </div>
    `).join('');
  } catch (error) {
    console.error('Load recent error:', error);
  }
}

// Activity log (simulated)
function updateActivityLog(action, filename) {
  const activityLog = document.getElementById('activityLog');
  const now = new Date().toLocaleString();
  const activityItem = document.createElement('div');
  activityItem.className = 'activity-item';
  activityItem.textContent = `${now}: ${action} ${filename}`;
  activityLog.insertBefore(activityItem, activityLog.firstChild);
  if (activityLog.children.length > 10) {
    activityLog.removeChild(activityLog.lastChild);
  }
}

// Categories
async function loadCategories() {
  try {
    const response = await fetch('/categories');
    const categories = await response.json();
    const categoryInput = document.getElementById('categoryInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const categoriesList = document.getElementById('categoriesList');

    categoryInput.innerHTML = '<option value="Uncategorized">Uncategorized</option>';
    categoryFilter.innerHTML = '<option value="">All Categories</option>';
    categoriesList.innerHTML = '';

    categories.forEach(category => {
      categoryInput.innerHTML += `<option value="${category}">${category}</option>`;
      categoryFilter.innerHTML += `<option value="${category}">${category}</option>`;
      categoriesList.innerHTML += `<div class="category-item">${category}</div>`;
    });
  } catch (error) {
    console.error('Load categories error:', error);
  }
}

// Upload functionality
document.getElementById('clearFile').addEventListener('click', () => {
  const fileInput = document.getElementById('fileInput');
  const uploadMessage = document.getElementById('uploadMessage');
  const filePreview = document.getElementById('filePreview');
  fileInput.value = '';
  uploadMessage.textContent = '';
  filePreview.innerHTML = '';
});

document.getElementById('fileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  const filePreview = document.getElementById('filePreview');
  if (file) {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        filePreview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 200px; max-height: 200px;">`;
      };
      reader.readAsDataURL(file);
    } else {
      filePreview.innerHTML = `<p>File: ${file.name} (${(file.size / 1024).toFixed(2)} KB)</p>`;
    }
  } else {
    filePreview.innerHTML = '';
  }
});

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData();
  const fileInput = document.getElementById('fileInput');
  const filenameInput = document.getElementById('filenameInput');
  const descriptionInput = document.getElementById('descriptionInput');
  const categoryInput = document.getElementById('categoryInput');
  const uploaderInput = document.getElementById('uploaderInput');
  const uploadMessage = document.getElementById('uploadMessage');
  const progressContainer = document.querySelector('.progress-container');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');

  if (!fileInput.files[0]) {
    uploadMessage.textContent = 'Please select a file to upload.';
    uploadMessage.style.color = 'red';
    return;
  }

  formData.append('file', fileInput.files[0]);
  formData.append('filename', filenameInput.value);
  formData.append('description', descriptionInput.value);
  formData.append('category', categoryInput.value);
  formData.append('uploader', uploaderInput.value);

  progressContainer.style.display = 'block';

  try {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        progressBar.style.width = percentComplete + '%';
        progressText.textContent = Math.round(percentComplete) + '%';
      }
    });

    xhr.addEventListener('load', () => {
      progressContainer.style.display = 'none';
      const result = JSON.parse(xhr.responseText);

      if (xhr.status === 200) {
        uploadMessage.textContent = `File "${result.filename}" uploaded successfully!`;
        uploadMessage.style.color = 'green';
        fileInput.value = '';
        filenameInput.value = '';
        descriptionInput.value = '';
        uploaderInput.value = 'Anonymous';
        document.getElementById('filePreview').innerHTML = '';
        loadArchives();
        loadStats();
        loadRecent();
        updateActivityLog('Uploaded', result.filename);
      } else {
        uploadMessage.textContent = result.error || 'Upload failed.';
        uploadMessage.style.color = 'red';
      }
    });

    xhr.addEventListener('error', () => {
      progressContainer.style.display = 'none';
      uploadMessage.textContent = 'An error occurred during upload.';
      uploadMessage.style.color = 'red';
    });

    xhr.open('POST', '/upload');
    xhr.send(formData);
  } catch (error) {
    console.error('Upload error:', error);
    progressContainer.style.display = 'none';
    uploadMessage.textContent = 'An error occurred during upload.';
    uploadMessage.style.color = 'red';
  }
});

// Archives table
async function loadArchives() {
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const sortSelect = document.getElementById('sortSelect');
  const archivesTableBody = document.getElementById('archivesTableBody');

  const params = new URLSearchParams({
    search: searchInput.value,
    category: categoryFilter.value,
    sort: sortSelect.value
  });

  try {
    const response = await fetch(`/archives?${params}`);
    const archives = await response.json();

    archivesTableBody.innerHTML = archives.map(archive => `
      <tr>
        <td>${archive.filename}</td>
        <td>${archive.description || ''}</td>
        <td>${new Date(archive.uploadDate).toLocaleDateString()}</td>
        <td>${archive.category}</td>
        <td>
          <button onclick="viewDetails('${archive.id}')" class="view-btn">🔍 View</button>
          <button onclick="downloadFile('${archive.id}')" class="download-btn">⬇️ Download</button>
          <button onclick="deleteArchive('${archive.id}', '${archive.filename}')" class="delete-btn">❌ Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Load archives error:', error);
    archivesTableBody.innerHTML = '<tr><td colspan="5">Failed to load archives.</td></tr>';
  }
}

document.getElementById('loadArchives').addEventListener('click', loadArchives);
document.getElementById('searchInput').addEventListener('input', loadArchives);
document.getElementById('categoryFilter').addEventListener('change', loadArchives);
document.getElementById('sortSelect').addEventListener('change', loadArchives);

// View details modal
async function viewDetails(id) {
  try {
    const response = await fetch(`/archive/${id}`);
    const archive = await response.json();

    const details = `
      <p><strong>Filename:</strong> ${archive.filename}</p>
      <p><strong>Description:</strong> ${archive.description || 'N/A'}</p>
      <p><strong>Size:</strong> ${(archive.size / 1024).toFixed(2)} KB</p>
      <p><strong>Upload Date:</strong> ${new Date(archive.uploadDate).toLocaleString()}</p>
      <p><strong>Content Type:</strong> ${archive.contentType}</p>
      <p><strong>Category:</strong> ${archive.category}</p>
      <p><strong>Uploader:</strong> ${archive.uploader}</p>
    `;

    document.getElementById('archiveDetails').innerHTML = details;
    document.getElementById('detailsModal').style.display = 'block';
  } catch (error) {
    console.error('View details error:', error);
  }
}

document.querySelector('.close').addEventListener('click', () => {
  document.getElementById('detailsModal').style.display = 'none';
});

window.addEventListener('click', (e) => {
  if (e.target === document.getElementById('detailsModal')) {
    document.getElementById('detailsModal').style.display = 'none';
  }
});

// Download file
function downloadFile(id) {
  window.open(`/download/${id}`, '_blank');
}

// Delete archive
async function deleteArchive(id, filename) {
  if (confirm(`Are you sure you want to delete "${filename}"?`)) {
    try {
      const response = await fetch(`/archive/${id}`, { method: 'DELETE' });
      if (response.ok) {
        loadArchives();
        loadStats();
        loadRecent();
        updateActivityLog('Deleted', filename);
      } else {
        alert('Failed to delete archive.');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('An error occurred while deleting the archive.');
    }
  }
}

// Management
document.getElementById('addCategoryBtn').addEventListener('click', async () => {
  const newCategoryInput = document.getElementById('newCategoryInput');
  const category = newCategoryInput.value.trim();
  if (category) {
    // For now, just add to local list. In a real app, you'd send to server.
    const categoriesList = document.getElementById('categoriesList');
    categoriesList.innerHTML += `<div class="category-item">${category}</div>`;
    newCategoryInput.value = '';
    loadCategories(); // Refresh
  }
});

document.getElementById('exportBtn').addEventListener('click', () => {
  window.open('/export', '_blank');
});
