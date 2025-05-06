// extensions/theme-extension/assets/branch-selector.js
(function() {
  // إدارة اختيار الفروع في موقع الويب
  class BranchSelector {
    constructor() {
      this.userLocation = null;
      this.branches = [];
      this.selectedBranchId = localStorage.getItem('selectedBranchId');
      this.init();
    }

    // تهيئة الفئة
    init() {
      this.getUserLocation()
        .then(() => this.fetchBranches())
        .catch(error => {
          console.error('Error initializing branch selector:', error);
          this.fetchBranches(); // جلب الفروع حتى في حالة فشل الحصول على الموقع
        });

      this.handleEventListeners();
    }

    // إضافة مستمعي الأحداث
    handleEventListeners() {
      document.addEventListener('DOMContentLoaded', () => {
        // التحقق مما إذا كنا في صفحة القائمة بدون اختيار فرع
        if (window.location.pathname.includes('/menu') && !this.selectedBranchId) {
          // إعادة التوجيه إلى الصفحة الرئيسية
          window.location.href = '/';
        }

        // عرض بيانات الفرع المحدد إذا كنا في صفحة القائمة
        if (window.location.pathname.includes('/menu') && this.selectedBranchId) {
          this.showSelectedBranchInfo();
        }
      });
    }

    // الحصول على موقع المستخدم
    async getUserLocation() {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported by this browser.'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            this.userLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };
            resolve(this.userLocation);
          },
          (error) => {
            console.warn('Error getting user location:', error);
            reject(error);
          },
          { timeout: 10000, enableHighAccuracy: true }
        );
      });
    }

    // جلب الفروع من واجهة برمجة التطبيقات
    async fetchBranches() {
      try {
        const response = await fetch('/api/branches?activeOnly=true');

        if (!response.ok) {
          throw new Error(`API response error: ${response.status}`);
        }

        const data = await response.json();
        this.branches = data.branches || [];

        // ترتيب الفروع حسب المسافة إذا كان متاحًا
        if (this.userLocation) {
          this.branches.forEach(branch => {
            branch.distance = this.calculateDistance(
              this.userLocation.latitude,
              this.userLocation.longitude,
              branch.latitude,
              branch.longitude
            );
          });

          this.branches.sort((a, b) => {
            if (a.distance === null && b.distance === null) return 0;
            if (a.distance === null) return 1;
            if (b.distance === null) return -1;
            return a.distance - b.distance;
          });
        }

        // تحديث واجهة المستخدم
        this.updateUI();
        return this.branches;
      } catch (error) {
        console.error('Error fetching branches:', error);
        this.handleError('Failed to fetch branches.');
        return [];
      }
    }

    // حساب المسافة بين نقطتين باستخدام صيغة هافرسين
    calculateDistance(lat1, lon1, lat2, lon2) {
      if (!lat1 || !lon1 || !lat2 || !lon2) return null;

      const R = 6371; // نصف قطر الأرض بالكيلومتر
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }

    // تحديث واجهة المستخدم
    updateUI() {
      // تحديث محدد الفروع إذا كان موجودًا
      const branchSelector = document.getElementById('branch-buttons-container');
      if (branchSelector) {
        this.updateBranchSelector(branchSelector);
      }

      // تحديث معلومات الفرع المحدد
      this.updateSelectedBranchInfo();
    }

    // تحديث محدد الفروع
    updateBranchSelector(container) {
      // إذا لم تكن هناك فروع
      if (this.branches.length === 0) {
        container.innerHTML = '<div class="no-branches">لا توجد فروع متاحة حاليًا.</div>';
        return;
      }

      // إنشاء أزرار للفروع
      container.innerHTML = '';

      this.branches.forEach(branch => {
        const branchButton = document.createElement('button');
        branchButton.className = 'branch-button';
        if (branch.id === this.selectedBranchId) {
          branchButton.classList.add('selected');
        }
        branchButton.setAttribute('data-branch-id', branch.id);
        branchButton.onclick = () => this.selectBranch(branch.id);

        let distanceHtml = '';
        if (branch.distance !== null) {
          distanceHtml = `<span class="branch-distance">${branch.distance.toFixed(1)} كم</span>`;
        }

        branchButton.innerHTML = `
          <div class="branch-info">
            <div class="branch-name">${branch.name}</div>
            ${branch.description ? `<div class="branch-description">${branch.description}</div>` : ''}
          </div>
          ${distanceHtml}
        `;

        container.appendChild(branchButton);
      });
    }

    // تحديث معلومات الفرع المحدد
    updateSelectedBranchInfo() {
      // التحقق في صفحات القائمة والسلة
      if (['/menu', '/cart', '/checkout'].some(path => window.location.pathname.includes(path))) {
        const selectedBranchInfo = document.getElementById('selected-branch-info');
        if (selectedBranchInfo) {
          this.showSelectedBranchInfo(selectedBranchInfo);
        }
      }
    }

    // عرض معلومات الفرع المحدد
    showSelectedBranchInfo(container = null) {
      if (!this.selectedBranchId) return;

      // البحث عن الفرع المحدد
      const branch = this.branches.find(b => b.id === this.selectedBranchId);
      if (!branch) {
        // إذا لم يتم العثور على الفرع، جلب البيانات أولاً
        this.fetchBranches().then(() => this.showSelectedBranchInfo(container));
        return;
      }

      // إذا لم يتم توفير الحاوية، نبحث عنها في DOM
      if (!container) {
        container = document.getElementById('selected-branch-info');
        if (!container) return;
      }

      // عرض معلومات الفرع
      container.innerHTML = `
        <div class="selected-branch">
          <h3>${branch.name}</h3>
          ${branch.description ? `<p>${branch.description}</p>` : ''}
          ${branch.address ? `<p><i class="icon-location"></i> ${branch.address}</p>` : ''}
          <button class="change-branch-btn" onclick="window.location.href='/'">تغيير الفرع</button>
        </div>
      `;
    }

    // اختيار فرع
    selectBranch(branchId) {
      this.selectedBranchId = branchId;
      localStorage.setItem('selectedBranchId', branchId);

      // تحديث واجهة المستخدم
      const buttons = document.querySelectorAll('.branch-button');
      buttons.forEach(button => {
        if (button.getAttribute('data-branch-id') === branchId) {
          button.classList.add('selected');
        } else {
          button.classList.remove('selected');
        }
      });

      // الانتقال إلى صفحة القائمة بعد فترة قصيرة
      setTimeout(() => {
        window.location.href = '/menu?branchId=' + branchId;
      }, 500);
    }

    // معالجة الأخطاء
    handleError(message) {
      const errorContainer = document.getElementById('branch-error');
      if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
      } else {
        console.error(message);
      }
    }
  }

  // إنشاء نسخة من محدد الفروع عند تحميل الصفحة
  window.addEventListener('DOMContentLoaded', () => {
    window.branchSelector = new BranchSelector();
  });
})();
