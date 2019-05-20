import * as marked from 'marked';
import hljs from 'highlight.js';
import HTTP from './http';
import Messages from './messages.vue';
import EventBus from './bus'

const getOffsetFromUrl = (url) => {
  const offsetMatch = url.match(/[?#].*offset=(\d+)/);
  if (offsetMatch == null) {
    return 0;
  }

  return parseInt(offsetMatch[1], 10);
};

const storeOffsetInUrl = (offset) => {
  let href = window.location.href;

  const fragmentStart = href.indexOf('#') + 1;
  if (fragmentStart === 0) {
    href += '#offset=' + offset;
  } else {
    const prefix = href.substring(0, fragmentStart);
    const fragment = href.substring(fragmentStart);

    const newFragment = fragment.split('&').map((fragmentPart) => {
      const keyValue = fragmentPart.split('=');
      return keyValue[0] === 'offset'
          ? 'offset=' + offset
          : fragmentPart;
    }).join('&');

    href = prefix + newFragment;
  }

  window.location.href = href;
};

export const annotationMixin = {
  data() {
    return {
      page: 0,
      docs: [],
      annotations: [],
      labels: [],
      guideline: '',
      total: 0,
      remaining: 0,
      searchQuery: '',
      url: '',
      offset: getOffsetFromUrl(window.location.href),
      picked: 'all',
      count: 0,
      isActive: false,
      existingTags:{},
      oldTags:[]
    };
  },
  methods: {
    async nextPage() {
      this.pageNumber += 1;
      if (this.pageNumber === this.docs.length) {
        if (this.next) {
          this.url = this.next;
          await this.search();
          this.pageNumber = 0;
        } else {
          this.pageNumber = this.docs.length - 1;
        }
      }
    },

    async prevPage() {
      this.pageNumber -= 1;
      if (this.pageNumber === -1) {
        if (this.prev) {
          this.url = this.prev;
          await this.search();
          this.pageNumber = this.docs.length - 1;
        } else {
          this.pageNumber = 0;
        }
      }

    },

    async search() {
      await HTTP.get(this.url).then((response) => {
        this.docs = response.data.results;
        this.next = response.data.next;
        this.prev = response.data.previous;
        this.count = response.data.count;
        this.annotations = [];
        for (let i = 0; i < this.docs.length; i++) {
          const doc = this.docs[i];
          this.annotations.push(doc.annotations);
        }
        this.offset = getOffsetFromUrl(this.url);
        this.setAnnotations()
      });
    },

    getState() {
      if (this.picked === 'all') {
        return '';
      }
      if (this.picked === 'active') {
        return 'true';
      }
      return 'false';
    },

    async submit() {
      const state = this.getState();
      this.url = `docs?q=${this.searchQuery}&is_checked=${state}&offset=${this.offset}`;
      await this.search();
      this.pageNumber = 0;
    },

    removeLabel(annotation) {
      const docId = this.docs[this.pageNumber].id;
      HTTP.delete(`docs/${docId}/annotations/${annotation.id}`).then(() => {
        const index = this.annotations[this.pageNumber].indexOf(annotation);
        this.annotations[this.pageNumber].splice(index, 1);
      });
    },

    replaceNull(shortcut) {
      if (shortcut === null) {
        shortcut = '';
      }
      shortcut = shortcut.split(' ');
      return shortcut;
    },

    shortcutKey(label) {
      let shortcut = label.suffix_key;
      if (label.prefix_key) {
        shortcut = `${label.prefix_key} ${shortcut}`;
      }
      return shortcut;
    },
  },

  watch: {
    picked() {
      this.submit();
    },

    annotations() {
      // fetch progress info.
      HTTP.get('statistics').then((response) => {
        this.total = response.data.total;
        this.remaining = response.data.remaining;
      });
    },

    offset() {
      storeOffsetInUrl(this.offset);
    },
  },

  created() {
    HTTP.get('labels').then((response) => {
      this.labels = response.data;
      this.setTags()
    });
    HTTP.get().then((response) => {
      this.guideline = response.data.guideline;
    });
    this.submit();
  },

  computed: {

    pageNumber:{
        set: function(n) {
          this.page = n;
          this.setAnnotations();
        },
        get: function() {
          return this.page;
        }
    },
    achievement() {
      const done = this.total - this.remaining;
      const percentage = Math.round(done / this.total * 100);
      return this.total > 0 ? percentage : 0;
    },

    compiledMarkdown() {
      return marked(this.guideline, {
        sanitize: true,
      });
    },

    id2label() {
      const id2label = {};
      for (let i = 0; i < this.labels.length; i++) {
        const label = this.labels[i];
        id2label[label.id] = label;
      }
      return id2label;
    },

    progressColor() {
      if (this.achievement < 30) {
        return 'is-danger';
      }
      if (this.achievement < 70) {
        return 'is-warning';
      }
      return 'is-primary';
    },
  },
};

export const uploadMixin = {
  components: {Messages},

  data: () => ({
    file: '',
    messages: [],
    format: 'json',
    isLoading: false,
  }),

  mounted() {
    hljs.initHighlighting();
  },

  methods: {
    upload() {
      this.isLoading = true;
      this.file = this.$refs.file.files[0];
      const formData = new FormData();
      formData.append('file', this.file);
      formData.append('format', this.format);
      HTTP.post('docs/upload',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }).then((response) => {
        console.log(response); // eslint-disable-line no-console
        this.messages = [];
        window.location = window.location.pathname.split('/').
            slice(0, -1).
            join('/');
      }).catch((error) => {
        this.isLoading = false;
        this.handleError(error);
      });
    },

    handleError(error) {
      const problems = Array.isArray(error.response.data)
          ? error.response.data
          : [error.response.data];

      problems.forEach((problem) => {
        if ('detail' in problem) {
          this.messages.push(problem.detail);
        } else if ('text' in problem) {
          this.messages = problem.text;
        }
      });
    },

    download() {
      const headers = {};
      if (this.format === 'csv') {
        headers.Accept = 'text/csv; charset=utf-8';
        headers['Content-Type'] = 'text/csv; charset=utf-8';
      } else {
        headers.Accept = 'application/json';
        headers['Content-Type'] = 'application/json';
      }
      HTTP({
        url: 'docs/download',
        method: 'GET',
        responseType: 'blob',
        params: {
          q: this.format,
        },
        headers,
      }).then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'file.' + this.format); // or any other extension
        document.body.appendChild(link);
        link.click();
      }).catch((error) => {
        this.handleError(error);
      });
    },
  },
};
