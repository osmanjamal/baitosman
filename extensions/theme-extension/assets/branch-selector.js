// extensions/theme-extension/assets/branch-selector.js
function selectBranch(branchId) {
  // Save selected branch ID to localStorage
  localStorage.setItem('selectedBranchId', branchId);

  // Redirect to menu page
  window.location.href = '/menu';
}

// Check if a branch is already selected
document.addEventListener('DOMContentLoaded', function() {
  const selectedBranchId = localStorage.getItem('selectedBranchId');

  // If on menu page and no branch selected, redirect to home
  if (window.location.pathname.includes('/menu') && !selectedBranchId) {
    window.location.href = '/';
  }
});
